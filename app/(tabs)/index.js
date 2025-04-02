import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar, List, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { getWorkouts, clearAllData } from '../utils/storage';

export default function Home() {
  const router = useRouter();
  const [lastWorkout, setLastWorkout] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState({
    completed: 0,
    total: 5,
    percentage: 0
  });
  const [goals] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadLastWorkout();
      loadWeeklyProgress();
    }, [])
  );

  const loadLastWorkout = async () => {
    try {
      const workouts = await getWorkouts();
      if (workouts && workouts.length > 0) {
        setLastWorkout(workouts[0]);
      }
    } catch (error) {
      console.error('Error loading last workout:', error);
    }
  };

  const loadWeeklyProgress = async () => {
    try {
      const workouts = await getWorkouts();
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklyWorkouts = workouts.filter(workout => 
        new Date(workout.date) >= startOfWeek
      );

      setWeeklyProgress({
        completed: weeklyWorkouts.length,
        total: 5, // objetivo semanal
        percentage: weeklyWorkouts.length / 5
      });
    } catch (error) {
      console.error('Error loading weekly progress:', error);
    }
  };

  const nextWorkout = {
    type: 'Espalda y Bíceps',
    exercises: ['Dominadas', 'Remo con Barra', 'Curl de Bíceps'],
    scheduledTime: '16:00'
  };

  const handleReset = () => {
    Alert.alert(
      "Reiniciar Aplicación",
      "¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Sí, reiniciar",
          style: "destructive",
          onPress: async () => {
            const success = await clearAllData();
            if (success) {
              Alert.alert("Éxito", "Todos los datos han sido eliminados");
              loadLastWorkout(); // Recargar los datos
            } else {
              Alert.alert("Error", "No se pudieron eliminar los datos");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Próximo Entrenamiento */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Próximo Entrenamiento</Title>
          <Paragraph style={styles.scheduleTime}>{nextWorkout.scheduledTime} - {nextWorkout.type}</Paragraph>
          <View style={styles.exerciseList}>
            {nextWorkout.exercises.map((exercise, index) => (
              <Paragraph key={index} style={styles.exerciseText}>• {exercise}</Paragraph>
            ))}
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="contained" 
            onPress={() => router.push({
              pathname: 'workout',
              params: { workoutType: nextWorkout.type }
            })}
            style={styles.primaryButton}
            labelStyle={styles.buttonLabel}
          >
            Comenzar entrenamiento
          </Button>
        </Card.Actions>
      </Card>

      {/* Progreso Semanal */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Tu progreso semanal</Title>
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={weeklyProgress.percentage} 
              color="#6200ee" 
              style={styles.progressBar}
            />
            <Paragraph style={styles.progressText}>
              {weeklyProgress.completed} de {weeklyProgress.total} entrenamientos completados
            </Paragraph>
          </View>
          <Divider style={styles.divider} />
          <Title style={styles.subTitle}>Objetivos Actuales</Title>
          {goals.map((goal, index) => (
            <View key={index} style={styles.goalItem}>
              <Paragraph>{goal.title}</Paragraph>
              <ProgressBar progress={goal.progress} color="#6200ee" style={styles.goalProgress} />
              <View style={styles.goalNumbers}>
                <Text style={styles.currentGoal}>{goal.current}</Text>
                <Text style={styles.targetGoal}>{goal.target}</Text>
              </View>
            </View>
          ))}
        </Card.Content>
        <Card.Actions>
          <Button mode="outlined" onPress={() => router.push('stats')}>
            Ver estadísticas
          </Button>
        </Card.Actions>
      </Card>

      {/* Último Entrenamiento */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Último Entrenamiento</Title>
          {lastWorkout ? (
            <>
              <Paragraph style={styles.workoutDate}>
                {new Date(lastWorkout.date).toLocaleDateString()}
              </Paragraph>
              <View style={styles.exercisesContainer}>
                {lastWorkout.exercises.map((exercise, index) => (
                  <List.Item
                    key={index}
                    title={exercise.name}
                    description={`${exercise.sets.length} series completadas`}
                    left={props => <List.Icon {...props} icon="dumbbell" />}
                    style={styles.exerciseItem}
                  />
                ))}
              </View>
            </>
          ) : (
            <Paragraph style={styles.noDataText}>No hay entrenamientos registrados</Paragraph>
          )}
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={() => router.push('history')}
            style={styles.secondaryButton}
            labelStyle={styles.secondaryButtonLabel}
          >
            Ver historial
          </Button>
        </Card.Actions>
      </Card>

      <Card style={[styles.card, styles.dangerCard]}>
        <Card.Content>
          <Title style={styles.dangerTitle}>Zona de Peligro</Title>
          <Paragraph style={styles.dangerText}>Eliminar todos los datos y empezar de cero</Paragraph>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="contained" 
            onPress={handleReset}
            style={styles.dangerButton}
            labelStyle={styles.dangerButtonLabel}
          >
            Reiniciar Aplicación
          </Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
  },
  title: {
    color: '#333333',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scheduleTime: {
    fontSize: 16,
    color: '#6200ee',
    marginVertical: 8,
    fontWeight: '500',
  },
  exerciseList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  exerciseText: {
    color: '#444444',
    fontSize: 15,
    marginBottom: 4,
  },
  cardActions: {
    padding: 8,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  primaryButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    elevation: 1,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    padding: 2,
  },
  progressContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  progressText: {
    textAlign: 'center',
    color: '#444444',
    marginTop: 8,
    fontSize: 15,
  },
  workoutDate: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 8,
  },
  exercisesContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  exerciseItem: {
    backgroundColor: 'white',
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    elevation: 1,
  },
  secondaryButton: {
    borderColor: '#6200ee',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 0,
  },
  secondaryButtonLabel: {
    color: '#6200ee',
    fontSize: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666666',
    fontStyle: 'italic',
    marginVertical: 16,
  },
  dangerCard: {
    borderColor: '#ffcdd2',
    borderWidth: 1,
  },
  dangerTitle: {
    color: '#ff5252',
  },
  dangerText: {
    color: '#666666',
  },
  dangerButton: {
    backgroundColor: '#ff5252',
    borderRadius: 8,
    elevation: 1,
  },
  dangerButtonLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#e0e0e0',
  },
  subTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
  },
  goalItem: {
    marginVertical: 8,
  },
  goalProgress: {
    height: 6,
    borderRadius: 3,
    marginVertical: 4,
  },
  goalNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  currentGoal: {
    fontSize: 12,
    color: '#666',
  },
  targetGoal: {
    fontSize: 12,
    color: '#6200ee',
  },
});
