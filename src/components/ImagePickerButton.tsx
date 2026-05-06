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
import { colors } from "../constants/colors";
import { useImageUpload } from "../hooks/useImageUpload";

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
  const { uploadImage, uploading } = useImageUpload(bucket);

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
          <TouchableOpacity style={styles.removeBtn} onPress={removeImage}>
            <X size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.placeholder} onPress={showPickerOptions}>
          {uploading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <ImageIcon size={32} color={colors.textMuted} />
              <Text style={styles.placeholderText}>Tap to add image</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {!currentImage && !uploading && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btn} onPress={() => handlePick("camera")}>
            <Camera size={18} color={colors.accent} />
            <Text style={styles.btnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => handlePick("gallery")}>
            <ImageIcon size={18} color={colors.accent} />
            <Text style={styles.btnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  placeholder: {
    height: 180,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    color: colors.textMuted,
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
    backgroundColor: "rgba(239,83,80,0.9)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});