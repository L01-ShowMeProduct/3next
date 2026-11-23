import 'package:flutter/material.dart';
import 'screens/capture_screen.dart';

void main() => runApp(const ThreeNextApp());

class ThreeNextApp extends StatelessWidget {
  const ThreeNextApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '3Next',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const CaptureScreen(),
    );
  }
}
