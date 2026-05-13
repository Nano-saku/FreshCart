import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";

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

    // FIX #1: Use ImagePicker.MediaType instead of deprecated MediaTypeOptions
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

  const uploadToSupabase = async (
    uri: string,
    path?: string,
  ): Promise<string | null> => {
    setUploading(true);

    try {
      // FIX #2: Use the new expo-file-system File class (SDK 55+) to read
      // the local file:// URI as an ArrayBuffer — no base64 roundtrip needed.
      // fetch() on a file:// URI cannot be serialized by Supabase's XHR layer.
      const file = new File(uri);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const ext =
        uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";

      const fileName = `${path || "public"}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${ext}`;

      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, bytes, {
          contentType,
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
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