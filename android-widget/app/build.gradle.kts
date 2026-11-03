plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.showmeproduct.next"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.showmeproduct.next"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        // Địa chỉ API mặc định. Người dùng có thể đổi trong app. Emulator gọi máy host qua 10.0.2.2.
        buildConfigField("String", "DEFAULT_API_URL", "\"https://3next-api.onrender.com\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Ký tạm bằng khóa debug để cài thử được. Cần khóa riêng khi phát hành thật.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
