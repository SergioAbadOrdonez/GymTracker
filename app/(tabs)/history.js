import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, IconButton } from 'react-native-paper';
import { getWorkouts, deleteWorkout } from '../utils/storage';

const CATEGORIES = {
  'Empuje': ['Pecho y Tríceps', 'Hombros', 'Push'],
  'Tirones': ['Espalda y Bíceps', 'Pull'],
  'Piernas': ['Piernas', 'Piernas y Core']
};

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    const savedWorkouts = await getWorkouts();
    setWorkouts(savedWorkouts || []);
  };

  const handleDeleteWorkout = async (workoutToDelete) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Estás seguro de que quieres eliminar este entrenamiento? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Eliminar de AsyncStorage
              await deleteWorkout(workoutToDelete);
              
              // Actualizar el estado local
              setWorkouts(prevWorkouts => 
                prevWorkouts.filter(w => 
                  w.date !== workoutToDelete.date || 
                  w.type !== workoutToDelete.type
                )
              );

              // Mostrar confirmación
              Alert.alert(
                "Éxito",
                "El entrenamiento ha sido eliminado correctamente"
              );
            } catch (error) {
              Alert.alert(
                "Error",
                "No se pudo eliminar el entrenamiento. Por favor, intenta de nuevo."
              );
            }
          }
        }
      ]
    );
  };

  const getWorkoutsByCategory = (category) => {
    return workouts.filter(workout => 
      CATEGORIES[category].includes(workout.type)
    );
  };

  const renderCategoryList = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Historial por Categoría</Text>
      {Object.keys(CATEGORIES).map((category) => (
        <TouchableOpacity
          key={category}
          style={styles.categoryButton}
          onPress={() => setSelectedCategory(category)}
        >
          <Card style={styles.categoryItem}>
            <Card.Content>
              <Text style={styles.categoryTitle}>{category}</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderWorkoutList = () => {
    const filteredWorkouts = getWorkoutsByCategory(selectedCategory);

    return (
      <ScrollView style={styles.container}>
        <Button 
          mode="contained"
          style={styles.backButton}
          onPress={() => setSelectedCategory(null)}
        >
          Volver a Categorías
        </Button>
        
        {filteredWorkouts.length === 0 ? (
          <Text style={styles.noWorkoutsText}>
            No hay entrenamientos en esta categoría
          </Text>
        ) : (
          filteredWorkouts.map((workout, index) => (
            <Card key={index} style={styles.card}>
              <Card.Content>
                <View style={styles.workoutHeader}>
                  <View style={styles.workoutTitleContainer}>
                    <Text style={styles.workoutTitle}>{workout.type}</Text>
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#FF0000"
                      onPress={() => handleDeleteWorkout(workout)}
                      style={styles.deleteButton}
                    />
                  </View>
                  <Text style={styles.date}>
                    {new Date(workout.date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.exercisesContainer}>
                  {workout.exercises.map((exercise, exIndex) => (
                    <View key={exIndex} style={styles.exerciseItem}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseDetails}>
                        Series: {exercise.sets.map(set => `${set.weight}kg x ${set.reps}`).join(', ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    );
  };

  return selectedCategory ? renderWorkoutList() : renderCategoryList();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 24,
    color: '#000000',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  categoryButton: {
    marginBottom: 8,
  },
  categoryItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryTitle: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '500',
  },
  backButton: {
    marginBottom: 16,
    backgroundColor: '#2196F3',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  workoutHeader: {
    marginBottom: 12,
  },
  workoutTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
  },
  date: {
    color: '#000000',
    fontSize: 14,
    marginTop: 4,
  },
  exercisesContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  exerciseItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseName: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
    fontWeight: '500',
  },
  exerciseDetails: {
    color: '#000000',
    fontSize: 14,
  },
  noWorkoutsText: {
    textAlign: 'center',
    color: '#000000',
    fontSize: 16,
    marginTop: 20,
  },
  deleteButton: {
    margin: 0,
    padding: 0,
  },
});
