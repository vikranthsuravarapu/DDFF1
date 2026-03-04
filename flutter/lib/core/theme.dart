import 'package:flutter/material.dart';

final ThemeData appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFFD4820A),
    primary: const Color(0xFFD4820A),
    secondary: const Color(0xFF2D5016),
    background: const Color(0xFFFDF6EC),
    surface: const Color(0xFFF0E6D3),
    error: const Color(0xFFC0392B),
  ),
  fontFamily: 'DM Sans',
  appBarTheme: const AppBarTheme(
    backgroundColor: Color(0xFF3B2A1A),
    foregroundColor: Colors.white,
    elevation: 0,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: const Color(0xFFD4820A),
      foregroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
      padding: const EdgeInsets.symmetric(vertical: 16),
    ),
  ),
  cardTheme: CardTheme(
    color: const Color(0xFFF0E6D3),
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  ),
);
