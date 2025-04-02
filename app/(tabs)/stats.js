import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Card, Title, Text, Divider, List, SegmentedButtons, Button, Paragraph } from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { getExerciseStats, getWorkouts } from '../utils/storage';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { EXERCISE_GROUPS } from '../utils/exercises';

// Añadir una paleta de colores predefinida
const CHART_COLORS = [
  '#FF6B6B',  // Rojo
  '#4ECDC4',  // Turquesa
  '#45B7D1',  // Azul claro
  '#96CEB4',  // Verde menta
  '#FFEEAD',  // Amarillo claro
  '#D4A5A5',  // Rosa
  '#9B59B6',  // Púrpura
  '#3498DB',  // Azul
  '#E67E22',  // Naranja
  '#2ECC71'   // Verde
];

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
    const exerciseMaxWeights = {};
    let totalDuration = 0;

    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseFrequency[exercise.name] = (exerciseFrequency[exercise.name] || 0) + 1;
        
        // Calcular el peso máximo por ejercicio
        exercise.sets.forEach(set => {
          if (set.weight) {
            const weight = parseFloat(set.weight);
            if (!exerciseMaxWeights[exercise.name] || weight > exerciseMaxWeights[exercise.name]) {
              exerciseMaxWeights[exercise.name] = weight;
            }
          }
        });
      });
      
      // Asumiendo un promedio de 1 hora por entrenamiento
      totalDuration += 60;
    });

    const mostFrequent = Object.entries(exerciseFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Encontrar el ejercicio con el peso máximo
    const heaviestExercise = Object.entries(exerciseMaxWeights)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    const heaviestWeight = exerciseMaxWeights[heaviestExercise] || 0;

    return {
      totalWorkouts: workouts.length,
      heaviestExercise: `${heaviestExercise} (${heaviestWeight}kg)`,
      mostFrequentExercise: mostFrequent,
      averageWorkoutDuration: workouts.length ? Math.round(totalDuration / workouts.length) : 0,
    };
  };

  const calculateWorkoutDistribution = (workouts) => {
    const distribution = {};
    workouts.forEach(workout => {
      const type = workout.type;
      distribution[type] = (distribution[type] || 0) + 1;
    });

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    let currentAngle = 0;
    
    return Object.entries(distribution)
      .map(([type, count], index) => {
        const percentage = Math.round((count / total) * 100);
        const angle = (count / total) * 360;
        const item = {
          name: type,
          count,
          percentage,
          color: CHART_COLORS[index % CHART_COLORS.length],
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
          legendFontWeight: '500',
          startAngle: currentAngle,
          angle: angle
        };
        currentAngle += angle;
        return item;
      })
      .sort((a, b) => b.count - a.count);
  };

  const selectExercise = async (exerciseName) => {
    // Si el ejercicio ya está seleccionado, lo deseleccionamos
    if (selectedExercise === exerciseName) {
      setSelectedExercise(null);
      setExerciseStats({}); // Cambiar a objeto vacío en lugar de null
      return;
    }

    // Si no, lo seleccionamos y cargamos sus estadísticas
    setSelectedExercise(exerciseName);
    const stats = await getExerciseStats(exerciseName);
    setExerciseStats(stats || {}); // Asegurar que siempre sea un objeto
  };

  const calculateMuscleGroupStats = (workouts) => {
    if (!workouts || workouts.length === 0) return [];

    const muscleGroups = {};
    let totalVolume = 0;

    // Inicializar todos los grupos musculares
    Object.keys(EXERCISE_GROUPS).forEach(group => {
      muscleGroups[group] = {
        volume: 0,
        frequency: 0,
        exercises: new Set(),
      };
    });

    workouts.forEach(workout => {
      if (!workout.exercises) return;

      workout.exercises.forEach(exercise => {
        // Encontrar a qué grupo muscular pertenece el ejercicio
        let muscleGroup = null;
        for (const [group, exercises] of Object.entries(EXERCISE_GROUPS)) {
          if (exercises.exercises.includes(exercise.name)) {
            muscleGroup = group;
            break;
          }
        }

        if (muscleGroup && muscleGroups[muscleGroup]) {
          muscleGroups[muscleGroup].frequency++;
          muscleGroups[muscleGroup].exercises.add(exercise.name);

          // Calcular volumen (peso * reps)
          if (exercise.sets) {
            exercise.sets.forEach(set => {
              if (set.weight && set.reps) {
                const volume = parseFloat(set.weight) * parseInt(set.reps);
                muscleGroups[muscleGroup].volume += volume;
                totalVolume += volume;
              }
            });
          }
        }
      });
    });

    // Convertir a formato para el gráfico
    const result = Object.entries(muscleGroups)
      .filter(([_, stats]) => stats.volume > 0) // Solo incluir grupos con volumen > 0
      .map(([name, stats], index) => ({
        name,
        count: stats.volume, // Necesario para el PieChart
        volume: Math.round(stats.volume),
        percentage: totalVolume > 0 ? Math.round((stats.volume / totalVolume) * 100) : 0,
        frequency: stats.frequency,
        exerciseCount: stats.exercises.size,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }))
      .sort((a, b) => b.volume - a.volume);

    console.log('Muscle group stats:', result); // Para depuración

    return result;
  };

  const calculatePersonalRecords = (workouts) => {
    const prs = {};
    const prHistory = {};

    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        if (!prs[exercise.name]) {
          prs[exercise.name] = {
            maxWeight: 0,
            maxReps: 0,
            maxVolume: 0,
            date: null
          };
        }
        if (!prHistory[exercise.name]) {
          prHistory[exercise.name] = [];
        }

        exercise.sets.forEach(set => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          const volume = weight * reps;

          // Actualizar PRs si encontramos nuevos máximos
          if (weight > prs[exercise.name].maxWeight) {
            prs[exercise.name].maxWeight = weight;
            prs[exercise.name].date = workout.date;
          }
          if (reps > prs[exercise.name].maxReps) {
            prs[exercise.name].maxReps = reps;
          }
          if (volume > prs[exercise.name].maxVolume) {
            prs[exercise.name].maxVolume = volume;
          }

          // Guardar historial para el gráfico
          prHistory[exercise.name].push({
            date: workout.date,
            weight,
            volume
          });
        });
      });
    });

    return { prs, prHistory };
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
              <Text style={styles.summaryValue}>{summaryStats.heaviestExercise}</Text>
              <Text style={styles.summaryLabel}>Ejercicio Más Pesado</Text>
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
            <View style={styles.distributionContainer}>
              <PieChart
                data={workoutDistribution}
                width={Dimensions.get('window').width - 32}
                height={200}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
                hasLegend={true}
                center={[30, 0]}
                radius={70}
              />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Análisis por Grupo Muscular */}
      {workouts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Análisis por Grupo Muscular</Title>
            {calculateMuscleGroupStats(workouts).length > 0 ? (
              <>
                <View style={styles.distributionContainer}>
                  <PieChart
                    data={calculateMuscleGroupStats(workouts)}
                    width={Dimensions.get('window').width - 32}
                    height={200}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="count"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                    hasLegend={true}
                    center={[40, 0]}
                    radius={70}
                  />
                </View>
                <View style={styles.muscleGroupDetails}>
                  {calculateMuscleGroupStats(workouts).map((group, index) => (
                    <View key={index} style={styles.muscleGroupItem}>
                      <Text style={styles.muscleGroupName}>{group.name}</Text>
                      <Text style={styles.muscleGroupStats}>
                        Volumen: {group.volume.toLocaleString()}kg • 
                        Frecuencia: {group.frequency} veces • 
                        Ejercicios: {group.exerciseCount}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>
                No hay datos disponibles para el análisis por grupo muscular
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Récords Personales */}
      {workouts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Récords Personales</Title>
            <List.AccordionGroup>
              {Object.entries(calculatePersonalRecords(workouts).prs).map(([exercise, records], index) => (
                <List.Accordion
                  key={index}
                  title={exercise}
                  id={index.toString()}
                  style={styles.prAccordion}
                >
                  <View style={styles.prDetails}>
                    <View style={styles.prItem}>
                      <Text style={styles.prLabel}>Peso Máximo</Text>
                      <Text style={styles.prValue}>{records.maxWeight}kg</Text>
                    </View>
                    <View style={styles.prItem}>
                      <Text style={styles.prLabel}>Reps Máximas</Text>
                      <Text style={styles.prValue}>{records.maxReps}</Text>
                    </View>
                    <View style={styles.prItem}>
                      <Text style={styles.prLabel}>Volumen Máximo</Text>
                      <Text style={styles.prValue}>{Math.round(records.maxVolume)}kg</Text>
                    </View>
                    <Text style={styles.prDate}>
                      Último PR: {new Date(records.date).toLocaleDateString()}
                    </Text>
                  </View>
                </List.Accordion>
              ))}
            </List.AccordionGroup>
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

      {selectedExercise && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.title}>{selectedExercise}</Title>
            <View style={styles.statsContainer}>
              <List.Item
                title="Peso Máximo"
                description={`${exerciseStats.maxWeight || 0} kg`}
                left={props => <List.Icon {...props} icon="dumbbell" />}
                style={styles.statItem}
              />
              <List.Item
                title="Último Peso"
                description={`${exerciseStats.lastWeight || 0} kg`}
                left={props => <List.Icon {...props} icon="clock-outline" />}
                style={styles.statItem}
              />
              <List.Item
                title="Promedio de Repeticiones"
                description={exerciseStats.averageReps || 0}
                left={props => <List.Icon {...props} icon="repeat" />}
                style={styles.statItem}
              />
              <List.Item
                title="Volumen Total"
                description={`${exerciseStats.totalVolume || 0} kg`}
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
  },
  distributionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    height: 200,
  },
  legendContainer: {
    flex: 1,
    paddingRight: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  chartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  pieSlice: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  muscleGroupDetails: {
    marginTop: 16,
  },
  muscleGroupItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  muscleGroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  muscleGroupStats: {
    fontSize: 14,
    color: '#666',
  },
  prAccordion: {
    backgroundColor: '#f8f9fa',
    marginBottom: 1,
  },
  prDetails: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prLabel: {
    fontSize: 14,
    color: '#666',
  },
  prValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  prDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
