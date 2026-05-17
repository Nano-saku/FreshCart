import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
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
      // Get current user
      const user = useAuthStore.getState().user;
      if (!user) {
        Alert.alert("Error", "You must be logged in to upload images");
        return null;
      }

      const response = await fetch(uri);
      const blob = await response.blob();

      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(blob.type)) {
        Alert.alert('Invalid file', 'Only JPEG, PNG, and WebP allowed.');
        return null;
      }

      // CRITICAL FIX: Path MUST start with user.id to satisfy RLS policy
      const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${random}.${ext}`;
      
      // Create path that starts with user ID
      let filePath: string;
      if (path) {
        // If path is provided (like 'products'), use it as subfolder under user ID
        filePath = `${user.id}/${path}/${fileName}`;
      } else {
        // Otherwise just put in user's root folder
        filePath = `${user.id}/${fileName}`;
      }

      console.log('Uploading to path:', filePath); // Debug log

      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
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