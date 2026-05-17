import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useImageUpload } from "../hooks/useImageUpload";
import { useMemo } from 'react';

interface ImagePickerButtonProps {
  currentImage?: string | null;
  onImageSelected: (url: string | null) => void;
  bucket?: string;
  path?: string;
  label?: string;
}

export function ImagePickerButton({
  currentImage,
  onImageSelected,
  bucket = "images",
  path = "products",
  label = "Product Image",
}: ImagePickerButtonProps) {
  const { theme, isDark } = useTheme();
  const { uploadImage, uploading } = useImageUpload(bucket);
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const handlePick = async (source: "camera" | "gallery") => {
    const url = await uploadImage(source, path);
    if (url) onImageSelected(url);
  };

  const showPickerOptions = () => {
    Alert.alert(
      "Select Image",
      "Choose how you want to add an image",
      [
        { text: "Camera", onPress: () => handlePick("camera") },
        { text: "Gallery", onPress: () => handlePick("gallery") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const removeImage = () => {
    onImageSelected(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {currentImage ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: currentImage }} style={styles.image} />
          <TouchableOpacity onPress={removeImage} style={styles.removeBtn}>
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={showPickerOptions} style={styles.placeholder} activeOpacity={0.8}>
          {uploading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <ImageIcon size={32} color={theme.textMuted} />
              <Text style={styles.placeholderText}>Tap to add image</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {!currentImage && !uploading && (
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => handlePick("camera")} style={styles.btn}>
            <Camera size={18} color={theme.textPrimary} />
            <Text style={styles.btnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePick("gallery")} style={styles.btn}>
            <ImageIcon size={18} color={theme.textPrimary} />
            <Text style={styles.btnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: typeof import("../constants/colors").lightTheme, isDark: boolean) => StyleSheet.create({
  container: { marginVertical: 8 },
  label: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  placeholder: {
    height: 180,
    borderRadius: 16,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    color: theme.textMuted,
    fontSize: 14,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 16,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.error + "E6",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});