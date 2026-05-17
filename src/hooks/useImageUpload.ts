import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";
import { logger } from "../lib/logger";
import { useAuthStore } from "../stores/authStore";

export function useImageUpload(bucket: string = "images") {
  const [uploading, setUploading] = useState(false);

  const pickImage = async (
    source: "camera" | "gallery",
  ): Promise<string | null> => {
    const permissionResult =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        `Please allow ${source} access in settings.`,
      );
      return null;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) return null;

    return result.assets[0].uri;
  };

  const uploadToSupabase = async (uri: string, path?: string) => {
    setUploading(true);

    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        Alert.alert("Error", "You must be logged in to upload images");
        return null;
      }

      // Fetch the image from the local URI
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to read image from device (status ${response.status})`);
      }

      // Convert to ArrayBuffer — this bypasses React Native's Blob polyfill
      // incompatibility with Supabase storage's FormData multipart upload.
      // Sending raw ArrayBuffer with an explicit content-type is the reliable
      // path for RN → Supabase storage uploads.
      const arrayBuffer = await response.arrayBuffer();

      // Derive content-type from the URI extension (blob.type is unreliable in RN)
      const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
      const contentTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      const contentType = contentTypeMap[ext] ?? "image/jpeg";

      // Build the storage path: <userId>/<subfolder?>/<filename>
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${random}.${ext}`;
      const filePath = path
        ? `${user.id}/${path}/${fileName}`
        : `${user.id}/${fileName}`;

      logger.log("Uploading to path:", filePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      logger.error("Upload error:", error);
      Alert.alert(
        "Upload failed",
        error.message || "Could not upload image. Please try again.",
      );
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (
    source: "camera" | "gallery",
    path?: string,
  ): Promise<string | null> => {
    const uri = await pickImage(source);
    if (!uri) return null;
    return uploadToSupabase(uri, path);
  };

  return { uploadImage, pickImage, uploadToSupabase, uploading };
}