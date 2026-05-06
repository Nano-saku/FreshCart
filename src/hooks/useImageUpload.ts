import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

export function useImageUpload(bucket: string = "images") {
  const [uploading, setUploading] = useState(false);

  const pickImage = async (source: "camera" | "gallery"): Promise<string | null> => {
    // Request permissions
    const permissionResult =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission required", `Please allow ${source} access in settings.`);
      return null;
    }

    // Launch picker
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
  path?: string
): Promise<string | null> => {
  setUploading(true);

  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    // Convert base64 to ArrayBuffer
    const arrayBuffer = Uint8Array.from(atob(base64), (c) =>
      c.charCodeAt(0)
    ).buffer;

    // File extension
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${
      path || "public"
    }/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${ext}`;

    // Upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
        upsert: false,
      });

    if (error) throw error;

    // Get URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return publicUrl;
  } catch (error: any) {
    console.error("Upload error:", error);
    Alert.alert("Upload failed", error.message);
    return null;
  } finally {
    setUploading(false);
  }
};

  const uploadImage = async (
    source: "camera" | "gallery",
    path?: string
  ): Promise<string | null> => {
    const uri = await pickImage(source);
    if (!uri) return null;
    return uploadToSupabase(uri, path);
  };

  return { uploadImage, pickImage, uploadToSupabase, uploading };
}