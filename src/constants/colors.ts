export const lightTheme = {
  // Primary brand colors - vibrant green matching reference
  primary: "#52B788", // Main green
  primaryDark: "#2D6A4F",
  primaryLight: "#74C69D",
  accent: "#95D5B2",

  // Backgrounds - light cream/green tint
  background: "#F1F8F4", // Very light green-tinted background
  surface: "#FFFFFF",
  surfaceVariant: "#F8FBF9",
  card: "#FFFFFF",

  // Text
  textPrimary: "#1B4332", // Dark green for text
  textSecondary: "#52796F",
  textMuted: "#95A99C",
  textInverse: "#FFFFFF",

  // Borders & Dividers
  border: "#D8E9E1",
  borderLight: "#E8F2ED",
  divider: "#E0EBE5",

  // Status
  success: "#52B788",
  error: "#E63946",
  warning: "#F77F00",
  info: "#4361EE",

  // Shadows
  shadowColor: "rgba(29, 53, 87, 0.08)",
  shadowColorStrong: "rgba(29, 53, 87, 0.15)",
};

export const darkTheme = {
  // Primary brand colors - same vibrant green
  primary: "#52B788",
  primaryDark: "#74C69D",
  primaryLight: "#95D5B2",
  accent: "#B7E4C7",

  // Backgrounds - dark navy/teal matching reference
  background: "#0D1B2A", // Deep navy blue
  surface: "#1B263B",
  surfaceVariant: "#253446",
  card: "#1B263B",

  // Text
  textPrimary: "#E0E1DD", // Light gray for dark mode
  textSecondary: "#C6C7C4",
  textMuted: "#778DA9",
  textInverse: "#1B4332",

  // Borders & Dividers
  border: "#2E3D4F",
  borderLight: "#3A4A5F",
  divider: "#2A3A4A",

  // Status
  success: "#52B788",
  error: "#E63946",
  warning: "#F77F00",
  info: "#4361EE",

  // Shadows
  shadowColor: "rgba(0, 0, 0, 0.3)",
  shadowColorStrong: "rgba(0, 0, 0, 0.5)",
};

// Export the light theme as default for backward compatibility
export const colors = lightTheme;
