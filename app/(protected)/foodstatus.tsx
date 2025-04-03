import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';

const FoodStatus = () => {
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [foodStatus, setFoodStatus] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const cameraRef = useRef<Camera>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync({ base64: true });
            setCapturedPhoto(photo.uri);
            if (photo.base64) {
                await uploadPhoto(photo.base64);
            }
        }
    };

    const uploadPhoto = async (base64: string) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: base64 })
            });
            const json = await response.json();
            setFoodStatus(json.status);
        } catch (error) {
            console.error('Error uploading photo:', error);
        } finally {
            setLoading(false);
        }
    };

    if (hasCameraPermission === null) {
        return (
            <View style={styles.container}>
                <Text>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasCameraPermission === false) {
        return (
            <View style={styles.container}>
                <Text>No access to camera</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {!capturedPhoto ? (
                <Camera style={styles.camera} ref={cameraRef} />
            ) : (
                <Image source={{ uri: capturedPhoto }} style={styles.preview} resizeMode="contain" />
            )}
            <View style={styles.buttonContainer}>
                <Button title="Take Photo" onPress={takePicture} />
            </View>
            {loading && <ActivityIndicator size="large" style={styles.indicator} />}
            {foodStatus !== '' && <Text style={styles.statusText}>Food Status: {foodStatus}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    camera: { width: '100%', height: '70%' },
    preview: { width: '100%', height: '70%' },
    buttonContainer: { margin: 20 },
    indicator: { margin: 10 },
    statusText: { fontSize: 18, marginTop: 10 }
});

export default FoodStatus;