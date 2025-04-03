import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Card, Divider } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// Directly set your API keys here using the new format
const WEATHER_API_KEY = "5e415c92fe7b4134be115656250304";
const GEMINI_API_KEY = "AIzaSyBa80AkcHCRJrVLh9YYSKQHyKWMNSKqo1g";

// Initialize Gemini AI using the key directly from our constant
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Custom hook for geolocation in Expo
const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError({ message: "Permission to access location was denied" });
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (err) {
        setError({ message: err.message });
      }
    })();
  }, []);

  return { location, error };
};

export default function WeatherPage() {
  const router = useRouter();

  const { location, error: locationError } = useGeolocation();
  const [weatherData, setWeatherData] = useState(null);
  const [farmingInsights, setFarmingInsights] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeatherAndInsights = async () => {
      if (location) {
        try {
          // Build the WeatherAPI URL using the constant API key
          const weatherApiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${location.latitude},${location.longitude}&days=3&aqi=no&alerts=no`;

          // Use Thingproxy to bypass CORS issues
          const proxyUrl = `https://thingproxy.freeboard.io/fetch/${weatherApiUrl}`;

          const weatherResponse = await fetch(proxyUrl);
          const weather = await weatherResponse.json();
          setWeatherData(weather);

          // Generate farming insights by passing in relevant data to Gemini AI
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const prompt = `Provide farming insights for location (${
            location.latitude
          }, ${location.longitude}) based on the weather data:

Location: ${weather.location.name}, ${weather.location.region}, ${
            weather.location.country
          }
Local Time: ${weather.location.localtime}

Current Weather:
- Temperature: ${weather.current.temp_c}°C (${weather.current.temp_f}°F)
- Feels Like: ${weather.current.feelslike_c}°C (${
            weather.current.feelslike_f
          }°F)
- Condition: ${weather.current.condition.text}
- Humidity: ${weather.current.humidity}%
- Wind: ${weather.current.wind_kph} kph (or ${
            weather.current.wind_mph
          } mph) from ${weather.current.wind_dir}
- Precipitation: ${weather.current.precip_mm}mm
- UV Index: ${weather.current.uv}

Forecast (next 3 days):
${weather.forecast.forecastday
  .map(
    (day) =>
      `Date: ${day.date}, Temp: ${day.day.mintemp_c}°C - ${day.day.maxtemp_c}°C, Rain Chance: ${day.day.daily_chance_of_rain}%`
  )
  .join("\n")}

Based on the above, provide brief farming insights and recommendations (max 3-4 concise points).`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          setFarmingInsights(response.text());
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchWeatherAndInsights();
  }, [location]);

  if (locationError) {
    return (
      <View style={styles.container}>
        <Text>Error getting location: {locationError.message}</Text>
      </View>
    );
  }

  if (loading || !weatherData) {
    return (
      <View style={styles.loadingContainer}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>FoodFlow</Text>
          </View>

          <LinearGradient
            colors={["#F5F7FF", "#EDF0FF"]}
            style={styles.background}
          />

          <ActivityIndicator size="large" color="#0000ff" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView className="flex-1">
        <View className="z-[20] flex-row items-center justify-between p-5 bg-white border-b border-gray-200 shadow">
          <TouchableOpacity
            className="p-2 rounded-full bg-white/80"
            onPress={() => router.push("/home")}
          >
            <Ionicons name="arrow-back" size={24} color="#303F9F" />
          </TouchableOpacity>
          <Text className="flex-1 text-2xl font-bold text-[#303F9F] text-center -ml-6">
            Weather
          </Text>
          <View className="w-6" />
        </View>

        <LinearGradient
          colors={["#F5F7FF", "#EDF0FF"]}
          style={styles.background}
        />

        <View className="p-4">
          <Text style={styles.pageTitle} className="text-center">
            Weather & Farming Insights
          </Text>

          {/* Current Weather Card */}
          <View style={styles.card}>
            <Text className="text-lg font-medium">
              Current Weather - {weatherData.location.name}
            </Text>

            <View className="bg-primary-500 p-3 rounded-lg gap-4 my-2 flex items-center flex-row">
              <Image
                source={{
                  uri: `https:${weatherData.current.condition.icon}`,
                }}
                className="size-[60px] bg-white rounded-xl border border-primary-500 outline outline-4 outline-primary-400"
              />
              <View>
                <Text style={styles.currentTemp} className="text-white">
                  {weatherData.current.temp_c}°C ({weatherData.current.temp_f}
                  °F)
                </Text>
                <Text className="text-white/70">
                  {weatherData.current.condition.text}
                </Text>
              </View>
            </View>

            {[
              {
                label: "Feels Like",
                value: `${weatherData.current.feelslike_c}°C (${weatherData.current.feelslike_f}°F)`,
              },
              {
                label: "Humidity",
                value: `${weatherData.current.humidity}%`,
              },
              {
                label: "Wind",
                value: `${weatherData.current.wind_kph} kph (${weatherData.current.wind_mph} mph) from ${weatherData.current.wind_dir}`,
              },
              {
                label: "Precipitation",
                value: `${weatherData.current.precip_mm}mm`,
              },
              {
                label: "UV Index",
                value: `${weatherData.current.uv}`,
              },
            ].map((item, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow,
                ]}
                className="flex flex-row items-center py-3 border-b border-zinc-300"
              >
                <Text
                  style={[styles.tableCell, styles.labelColumn]}
                  className="flex-1 font-medium"
                >
                  {item.label}
                </Text>
                <Text style={[styles.tableCell, styles.valueColumn]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Forecast Card */}
          <View style={styles.card}>
            <Text className="text-lg font-medium">3-day Forecast</Text>

            <View className="mt-2 flex flex-col gap-2">
              {weatherData.forecast.forecastday.map((day) => (
                <View
                  key={day.date}
                  className="bg-zinc-100 rounded-lg border border-zinc-300 p-2"
                >
                  <Text className="text-primary-700 font-medium text-lg mb-1">
                    {new Date(day.date).toLocaleDateString()}
                  </Text>
                  <Text>
                    Temperature: {day.day.mintemp_c}°C - {day.day.maxtemp_c}°C
                  </Text>
                  <Text>Condition: {day.day.condition.text}</Text>
                  <Text>Rain Chance: {day.day.daily_chance_of_rain}%</Text>
                  <Text>
                    Sunrise: {day.astro.sunrise} | Sunset: {day.astro.sunset}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Farming Insights Card */}
          <View style={styles.card}>
            <Text className="text-lg font-medium">Farming Insights</Text>
            <Divider className="my-2" />
            <Markdown>{farmingInsights}</Markdown>c
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#666",
    marginBottom: 3,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    width: Dimensions.get("window").width,
    height: 2200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  currentTemp: {
    fontSize: 24,
    fontWeight: "bold",
  },
  weatherDetails: {
    gap: 8,
  },
  forecastDay: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  dayTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  insights: {
    lineHeight: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white", // Changed from rgba with transparency
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#303F9F",
  },
});
