import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Card, Title, Text, Divider, List, SegmentedButtons, Button, Paragraph } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getExerciseStats, getWorkouts } from '../utils/storage';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [exerciseStats, setExerciseStats] = useState({});
  const [exercises, setExercises] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [summaryStats, setSummaryStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    mostFrequentExercise: '',
    averageWorkoutDuration: 0,
  });
  const [workoutDistribution, setWorkoutDistribution] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [exerciseList, setExerciseList] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const workouts = await getWorkouts();
      if (workouts.length === 0) {
        // Si no hay entrenamientos, resetear todos los estados
        setWorkouts([]);
        setExerciseList([]);
        setSelectedExercise(null);
        setExerciseStats(null);
        return;
      }
      
      // Filtrar workouts según el período seleccionado
      const now = new Date();
      const filteredWorkouts = workouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        if (selectedPeriod === 'week') {
          return now - workoutDate <= 7 * 24 * 60 * 60 * 1000;
        } else if (selectedPeriod === 'month') {
          return now - workoutDate <= 30 * 24 * 60 * 60 * 1000;
        }
        return now - workoutDate <= 365 * 24 * 60 * 60 * 1000;
      });

      // Calcular estadísticas generales
      const summary = calculateSummaryStats(filteredWorkouts);
      setSummaryStats(summary);

      // Calcular distribución de tipos de entrenamiento
      const distribution = calculateWorkoutDistribution(filteredWorkouts);
      setWorkoutDistribution(distribution);

      // Obtener ejercicios únicos y sus estadísticas
      const uniqueExercises = [...new Set(
        filteredWorkouts.flatMap(workout => 
          workout.exercises.map(exercise => exercise.name)
        )
      )];
      setExercises(uniqueExercises);

      const stats = {};
      for (const exercise of uniqueExercises) {
        stats[exercise] = await getExerciseStats(exercise);
      }
      setExerciseStats(stats);

      // Obtener lista única de ejercicios de todos los entrenamientos
      const allExercises = new Set();
      workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
          allExercises.add(exercise.name);
        });
      });

      setWorkouts(workouts);
      setExerciseList(Array.from(allExercises));
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummaryStats = (workouts) => {
    const exerciseFrequency = {};
    let totalVolume = 0;
    let totalDuration = 0;

    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseFrequency[exercise.name] = (exerciseFrequency[exercise.name] || 0) + 1;
        
        exercise.sets.forEach(set => {
          if (set.weight && set.reps) {
            totalVolume += parseFloat(set.weight) * parseInt(set.reps);
          }
        });
      });
      
      // Asumiendo un promedio de 1 hora por entrenamiento
      totalDuration += 60;
    });

    const mostFrequent = Object.entries(exerciseFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalWorkouts: workouts.length,
      totalVolume: Math.round(totalVolume),
      mostFrequentExercise: mostFrequent,
      averageWorkoutDuration: workouts.length ? Math.round(totalDuration / workouts.length) : 0,
    };
  };

  const calculateWorkoutDistribution = (workouts) => {
    const distribution = {};
    workouts.forEach(workout => {
      distribution[workout.type] = (distribution[workout.type] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, count]) => ({
      name,
      count,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    }));
  };

  const selectExercise = async (exerciseName) => {
    setSelectedExercise(exerciseName);
    const stats = await getExerciseStats(exerciseName);
    setExerciseStats(stats);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={selectedPeriod}
        onValueChange={setSelectedPeriod}
        buttons={[
          { value: 'week', label: 'Semana' },
          { value: 'month', label: 'Mes' },
          { value: 'year', label: 'Año' },
        ]}
        style={styles.periodSelector}
      />

      {/* Resumen General */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Resumen {selectedPeriod === 'week' ? 'Semanal' : selectedPeriod === 'month' ? 'Mensual' : 'Anual'}</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.totalWorkouts}</Text>
              <Text style={styles.summaryLabel}>Entrenamientos</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.totalVolume.toLocaleString()}kg</Text>
              <Text style={styles.summaryLabel}>Volumen Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.averageWorkoutDuration}min</Text>
              <Text style={styles.summaryLabel}>Duración Media</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.mostFrequentExercise}</Text>
              <Text style={styles.summaryLabel}>Ejercicio Más Frecuente</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Distribución de Entrenamientos */}
      {workoutDistribution.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Distribución de Entrenamientos</Title>
            <PieChart
              data={workoutDistribution}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
            />
          </Card.Content>
        </Card>
      )}

      {/* Progreso de Ejercicios */}
      {exercises.map(exerciseName => {
        const stats = exerciseStats[exerciseName];
        if (!stats || !stats.history || stats.history.length < 2) return null;
        
        return (
          <Card key={exerciseName} style={styles.card}>
            <Card.Content>
              <Title>{exerciseName}</Title>
              
              <LineChart
                data={{
                  labels: stats.history.map(h => h.date.slice(-5)),
                  datasets: [{
                    data: stats.history.map(h => h.weight)
                  }]
                }}
                width={Dimensions.get('window').width - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#6200ee"
                  }
                }}
                bezier
                style={styles.chart}
              />

              <Divider style={styles.divider} />
              
              <List.Section>
                <List.Item
                  title="Récord Personal"
                  description={`${stats.personalBest.weight}kg x ${stats.personalBest.reps} reps (${stats.personalBest.date})`}
                  left={props => <List.Icon {...props} icon="trophy" />}
                />
                <List.Item
                  title="Progreso en el período"
                  description={`${((stats.lastWeight - stats.history[0].weight) / stats.history[0].weight * 100).toFixed(1)}%`}
                  left={props => <List.Icon {...props} icon="trending-up" />}
                />
                <List.Item
                  title="Volumen Total"
                  description={`${stats.totalVolume.toLocaleString()}kg`}
                  left={props => <List.Icon {...props} icon="weight" />}
                />
              </List.Section>
            </Card.Content>
          </Card>
        );
      })}

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Ejercicios</Title>
          {exerciseList.length > 0 ? (
            <View style={styles.exerciseButtonsContainer}>
              {exerciseList.map((exercise, index) => (
                <Button
                  key={index}
                  mode={selectedExercise === exercise ? "contained" : "outlined"}
                  onPress={() => selectExercise(exercise)}
                  style={[
                    styles.exerciseButton,
                    selectedExercise === exercise && styles.selectedExerciseButton
                  ]}
                  labelStyle={styles.buttonLabel}
                >
                  {exercise}
                </Button>
              ))}
            </View>
          ) : (
            <Text style={styles.noDataText}>
              No hay datos de ejercicios disponibles
            </Text>
          )}
        </Card.Content>
      </Card>

      {selectedExercise && exerciseStats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.title}>{selectedExercise}</Title>
            <View style={styles.statsContainer}>
              <List.Item
                title="Peso Máximo"
                description={`${exerciseStats.maxWeight} kg`}
                left={props => <List.Icon {...props} icon="dumbbell" />}
                style={styles.statItem}
              />
              <List.Item
                title="Último Peso"
                description={`${exerciseStats.lastWeight} kg`}
                left={props => <List.Icon {...props} icon="clock-outline" />}
                style={styles.statItem}
              />
              <List.Item
                title="Promedio de Repeticiones"
                description={exerciseStats.averageReps}
                left={props => <List.Icon {...props} icon="repeat" />}
                style={styles.statItem}
              />
              <List.Item
                title="Volumen Total"
                description={`${exerciseStats.totalVolume} kg`}
                left={props => <List.Icon {...props} icon="chart-bar" />}
                style={styles.statItem}
              />
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  periodSelector: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chart: {
    marginVertical: 16,
    borderRadius: 16,
  },
  divider: {
    marginVertical: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#333333',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  exerciseButtonsContainer: {
    flexDirection: 'column',
  },
  exerciseButton: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  selectedExerciseButton: {
    backgroundColor: '#6200ee',
  },
  buttonLabel: {
    fontSize: 14,
    padding: 4,
  },
  statsContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  statItem: {
    backgroundColor: 'white',
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  noDataText: {
    textAlign: 'center',
    color: '#444444',
    marginTop: 16,
    fontStyle: 'italic',
  }
});
