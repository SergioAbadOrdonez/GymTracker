import { Tabs } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarActiveTintColor: '#6200ee',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Entrenamiento',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="dumbbell" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color }) => <MaterialIcons name="history" size={24} color={color} />
        }}
      />
      <Tabs.Screen
        name="custom-routines"
        options={{
          title: 'Mis Rutinas',
          tabBarIcon: ({ color }) => <MaterialIcons name="playlist-add" size={24} color={color} />
        }}
      />
    </Tabs>
  );
}
