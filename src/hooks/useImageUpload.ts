import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
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

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      // Fetch the image as a blob — works reliably in Expo without FileSystem
      const response = await fetch(uri);
      if (!response.ok) throw new Error("Failed to read image file");
      const blob = await response.blob();

      const ext =
        uri.split(".").pop()?.toLowerCase().split("?")[0] ||
        (blob.type === "image/png" ? "png" : "jpg");

      const fileName = `${path || "public"}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${ext}`;

      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
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
