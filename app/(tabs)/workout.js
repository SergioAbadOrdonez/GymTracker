import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import { Card, Title, TextInput, Button, List, IconButton, FAB, Portal, Modal, Menu, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { saveWorkout, getCustomRoutines } from '../utils/storage';
import { EXERCISE_GROUPS, getMuscleGroups } from '../utils/exercises';

const WORKOUT_TYPES = [
  {
    name: 'Pecho y Tríceps',
    exercises: ['Press de Banca', 'Press Inclinado', 'Aperturas', 'Extensiones de Tríceps']
  },
  {
    name: 'Espalda y Bíceps',
    exercises: ['Dominadas', 'Remo con Barra', 'Pulldown', 'Curl de Bíceps']
  },
  {
    name: 'Piernas',
    exercises: ['Sentadilla', 'Peso Muerto', 'Prensa', 'Extensiones']
  },
  {
    name: 'Hombros',
    exercises: ['Press Militar', 'Elevaciones Laterales', 'Elevaciones Frontales', 'Pájaros']
  }
];

export default function WorkoutScreen() {
  const router = useRouter();
  const { workoutType: initialWorkoutType, routineId } = useLocalSearchParams();
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const [workoutType, setWorkoutType] = useState(() => {
    // Inicializar con el tipo pasado por parámetro o el primero de la lista
    const found = WORKOUT_TYPES.find(w => w.name === initialWorkoutType);
    return found || WORKOUT_TYPES[0];
  });
  const [exercises, setExercises] = useState([]);
  const [customRoutines, setCustomRoutines] = useState([]);
  const [currentRoutine, setCurrentRoutine] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showWorkoutTypeMenu, setShowWorkoutTypeMenu] = useState(false);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    loadCustomRoutines();
  }, []);

  useEffect(() => {
    console.log('Received routineId:', routineId);
    console.log('Received routineId type:', typeof routineId);
    console.log('Available custom routines:', customRoutines);
    
    if (routineId) {
      const routine = customRoutines.find(r => {
        console.log('Comparing:', r.id, routineId);
        console.log('Types:', typeof r.id, typeof routineId);
        return String(r.id) === String(routineId);
      });
      
      if (routine) {
        console.log('Found routine:', routine);
        setCurrentRoutine(routine);
        initializeExercises(routine.exercises);
      } else {
        console.error('Routine not found:', routineId);
        console.log('Available routines:', customRoutines);
      }
    } else if (initialWorkoutType) {
      const found = WORKOUT_TYPES.find(w => w.name === initialWorkoutType);
      if (found) {
        setWorkoutType(found);
        setCurrentRoutine(null);
        initializeExercises(found.exercises);
      }
    }
  }, [initialWorkoutType, routineId, customRoutines]);

  useEffect(() => {
    if (!routineId) {
      initializeExercises(workoutType.exercises);
    }
  }, [workoutType]);

  useEffect(() => {
    let interval = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      if (isTimerActive) {
        Alert.alert('¡Descanso completado!', 'Es hora de tu siguiente serie.');
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const loadCustomRoutines = async () => {
    try {
      const routines = await getCustomRoutines();
      console.log('Loaded routines:', routines);
      setCustomRoutines(routines || []);
    } catch (error) {
      console.error('Error loading custom routines:', error);
    }
  };

  const initializeExercises = (exerciseList) => {
    setExercises(exerciseList.map((name, id) => ({
      id: id + 1,
      name,
      sets: [
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false },
      ],
    })));
  };

  const updateSet = (exerciseId, setIndex, field, value) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        const newSets = [...exercise.sets];
        newSets[setIndex] = { ...newSets[setIndex], [field]: value };
        return { ...exercise, sets: newSets };
      }
      return exercise;
    }));
  };

  const toggleSetCompletion = (exerciseId, setIndex) => {
    setExercises(exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        const newSets = [...exercise.sets];
        newSets[setIndex] = { 
          ...newSets[setIndex], 
          completed: !newSets[setIndex].completed 
        };
        
        // Iniciar temporizador si se marca como completado
        if (!exercise.sets[setIndex].completed) {
          setTimer(150);  // Cambiado de 90 a 150 segundos (2.5 minutos)
          setIsTimerActive(true);
        }
        
        return { ...exercise, sets: newSets };
      }
      return exercise;
    }));
  };

  const addExercise = (exerciseName) => {
    // Verificar si el ejercicio ya existe
    const exerciseExists = exercises.some(exercise => exercise.name === exerciseName);
    
    if (exerciseExists) {
      Alert.alert(
        'Ejercicio Duplicado',
        'Este ejercicio ya está en tu rutina. No puedes añadir el mismo ejercicio dos veces.',
        [
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    setExercises([
      ...exercises,
      {
        id: exercises.length + 1,
        name: exerciseName,
        sets: [
          { weight: '', reps: '', completed: false },
          { weight: '', reps: '', completed: false },
          { weight: '', reps: '', completed: false },
        ],
      }
    ]);
    setShowExerciseModal(false);
  };

  const updateNotes = (exerciseId, note) => {
    setNotes({
      ...notes,
      [exerciseId]: note
    });
  };

  const handleFinishWorkout = async () => {
    // Verificar si hay ejercicios completados
    const hasCompletedSets = exercises.some(exercise => 
      exercise.sets.some(set => set.completed)
    );

    if (!hasCompletedSets) {
      Alert.alert('Error', 'Debes completar al menos una serie para finalizar el entrenamiento');
      return;
    }

    // Crear objeto de entrenamiento
    const workout = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: workoutType.name,
      exercises: exercises.map(exercise => ({
        name: exercise.name,
        sets: exercise.sets.filter(set => set.completed && set.weight && set.reps).map(set => ({
          weight: parseFloat(set.weight),
          reps: parseInt(set.reps),
          completed: set.completed
        })),
        notes: notes[exercise.id] || ''
      })).filter(exercise => exercise.sets.length > 0)
    };

    try {
      const success = await saveWorkout(workout);
      if (success) {
        Alert.alert(
          '¡Entrenamiento Completado!',
          'Tu entrenamiento ha sido guardado exitosamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Usar replace en lugar de push para forzar una recarga completa
                router.replace('/');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo guardar el entrenamiento');
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el entrenamiento');
    }
  };

  const handleWorkoutTypePress = (event) => {
    // Obtener las dimensiones del botón
    const { nativeEvent } = event;
    setMenuAnchor({
      x: nativeEvent.pageX,
      y: nativeEvent.pageY
    });
    setShowWorkoutTypeMenu(true);
  };

  const handleDeleteExercise = (exerciseId) => {
    Alert.alert(
      "Eliminar Ejercicio",
      "¿Estás seguro de que quieres eliminar este ejercicio?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setExercises(exercises.filter(exercise => exercise.id !== exerciseId));
          }
        }
      ]
    );
  };

  const moveExercise = (fromIndex, toIndex) => {
    setExercises(prevExercises => {
      const newExercises = [...prevExercises];
      const [movedExercise] = newExercises.splice(fromIndex, 1);
      newExercises.splice(toIndex, 0, movedExercise);
      return newExercises;
    });
  };

  return (
    <View style={styles.container}>
      <Portal>
        <Menu
          visible={showWorkoutTypeMenu}
          onDismiss={() => setShowWorkoutTypeMenu(false)}
          anchor={menuAnchor}
          contentStyle={styles.menuContent}
        >
          {WORKOUT_TYPES.map((type, index) => (
            <Menu.Item
              key={index}
              onPress={() => {
                setWorkoutType(type);
                initializeExercises(type.exercises);
                setShowWorkoutTypeMenu(false);
              }}
              title={type.name}
              style={styles.menuItem}
            />
          ))}
        </Menu>
      </Portal>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Card style={styles.typeCard}>
          <Card.Content>
            <Title style={styles.title}>Tipo de Entrenamiento</Title>
            <Button
              mode="outlined"
              onPress={handleWorkoutTypePress}
              style={styles.typeButton}
            >
              {currentRoutine ? currentRoutine.name : workoutType.name}
            </Button>
          </Card.Content>
        </Card>

        {isTimerActive && (
          <Card style={styles.timerCard}>
            <Card.Content>
              <Title>Tiempo de Descanso</Title>
              <Text style={styles.timer}>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Text>
              <Button onPress={() => setIsTimerActive(false)}>
                Saltar Descanso
              </Button>
            </Card.Content>
          </Card>
        )}

        {exercises.map((exercise, index) => (
          <Card key={exercise.id} style={styles.exerciseCard}>
            <Card.Content>
              <View style={styles.exerciseHeader}>
                <Title style={styles.exerciseTitle}>{exercise.name}</Title>
                <View style={styles.exerciseActions}>
                  <IconButton
                    icon="arrow-up"
                    size={24}
                    onPress={() => moveExercise(index, Math.max(0, index - 1))}
                    disabled={index === 0}
                  />
                  <IconButton
                    icon="arrow-down"
                    size={24}
                    onPress={() => moveExercise(index, Math.min(exercises.length - 1, index + 1))}
                    disabled={index === exercises.length - 1}
                  />
                  <IconButton
                    icon="delete"
                    size={24}
                    onPress={() => handleDeleteExercise(exercise.id)}
                  />
                </View>
              </View>
              
              {exercise.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                  <TextInput
                    label="Peso"
                    value={set.weight}
                    onChangeText={(text) => updateSet(exercise.id, setIndex, 'weight', text)}
                    keyboardType="numeric"
                    style={styles.setInput}
                  />
                  <TextInput
                    label="Reps"
                    value={set.reps}
                    onChangeText={(text) => updateSet(exercise.id, setIndex, 'reps', text)}
                    keyboardType="numeric"
                    style={styles.setInput}
                  />
                  <IconButton
                    icon={set.completed ? "check-circle" : "circle-outline"}
                    size={24}
                    onPress={() => toggleSetCompletion(exercise.id, setIndex)}
                    style={set.completed ? styles.completedSet : styles.incompleteSet}
                  />
                </View>
              ))}
              <TextInput
                style={styles.notes}
                placeholder="Notas del ejercicio..."
                value={notes[exercise.id] || ''}
                onChangeText={(text) => updateNotes(exercise.id, text)}
                multiline
              />
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Button
        mode="contained"
        onPress={handleFinishWorkout}
        style={styles.finishButton}
        contentStyle={styles.buttonContent}
      >
        Finalizar Entrenamiento
      </Button>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowExerciseModal(true)}
      />

      <Portal>
        <Modal
          visible={showExerciseModal}
          onDismiss={() => setShowExerciseModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>Añadir Ejercicio</Title>
            {getMuscleGroups().map((groupName) => (
              <List.Accordion
                key={groupName}
                title={groupName}
                left={props => <List.Icon {...props} icon="dumbbell" />}
                style={styles.accordion}
              >
                {EXERCISE_GROUPS[groupName].exercises.map((exercise, index) => (
                  <List.Item
                    key={index}
                    title={exercise}
                    onPress={() => addExercise(exercise)}
                    right={props => <List.Icon {...props} icon="plus" />}
                  />
                ))}
              </List.Accordion>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Añadir padding extra para el botón fijo
  },
  finishButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#6200ee',
  },
  typeCard: {
    marginBottom: 16,
    elevation: 4,
    backgroundColor: 'white',
  },
  typeButton: {
    marginTop: 10,
    width: '100%',
  },
  menu: {
    marginTop: 50,
  },
  card: {
    margin: 10,
    marginBottom: 16,
    elevation: 4,
    backgroundColor: 'white',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseTitle: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
  },
  deleteButton: {
    margin: 0,  // Quitar margen extra
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    marginHorizontal: 4,
    height: 40,
    backgroundColor: 'white',
    color: '#333333',
  },
  notes: {
    marginTop: 8,
    backgroundColor: 'white',
    color: '#333333',
  },
  setNumber: {
    width: 60,
    color: '#444444',
  },
  timerCard: {
    marginBottom: 16,
    backgroundColor: '#E8F5E9',
  },
  timer: {
    fontSize: 32,
    textAlign: 'center',
    marginVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 60, // Reducir la distancia desde abajo para que esté más cerca del botón de finalizar
    backgroundColor: '#6200ee',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
  },
  finishContainer: {
    margin: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  buttonContent: {
    height: 48,
    borderRadius: 8,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  menuHeader: {
    backgroundColor: '#f0f0f0',
  },
  title: {
    color: '#333333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 4,
    marginTop: 8,
  },
  menuItem: {
    minWidth: 200,
  },
  accordion: {
    backgroundColor: 'white',
    marginBottom: 4,
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setInput: {
    flex: 1,
    marginHorizontal: 4,
    height: 40,
    backgroundColor: 'white',
    color: '#333333',
  },
  completedSet: {
    backgroundColor: '#e8f5e9',
  },
  incompleteSet: {
    backgroundColor: '#f5f5f5',
  },
});
