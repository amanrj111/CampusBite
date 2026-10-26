import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import MenuScreen from "./src/screens/MenuScreen";
import CartScreen from "./src/screens/CartScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import TrackScreen from "./src/screens/TrackScreen";
import WalletScreen from "./src/screens/WalletScreen";
import KitchenScreen from "./src/screens/KitchenScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function UserTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerTitle: "CampusBite", tabBarActiveTintColor: "#ea580c" }}>
      <Tabs.Screen name="Menu" component={MenuScreen} />
      <Tabs.Screen name="Cart" component={CartScreen} />
      <Tabs.Screen name="Orders" component={OrdersScreen} />
      <Tabs.Screen name="Wallet" component={WalletScreen} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color="#ea580c" />
      </View>
    );
  }
  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : user.role === "KITCHEN" || user.role === "ADMIN" ? (
        <Stack.Screen name="Kitchen" component={KitchenScreen} options={{ title: "Kitchen board" }} />
      ) : (
        <>
          <Stack.Screen name="Home" component={UserTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Track" component={TrackScreen} options={{ title: "Track order" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}
