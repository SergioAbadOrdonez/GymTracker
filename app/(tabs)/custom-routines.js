import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, TextInput, Button, List, FAB, Portal, Modal, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { saveCustomRoutine, getCustomRoutines, deleteCustomRoutine } from '../utils/storage';
import { EXERCISE_GROUPS, getMuscleGroups } from '../utils/exercises';

export default function CustomRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [newRoutine, setNewRoutine] = useState({
    name: '',
    exercises: ['']
  });

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    const customRoutines = await getCustomRoutines();
    setRoutines(customRoutines);
  };

  const handleAddExercise = (exercise = '') => {
    if (showEditModal) {
      setEditingRoutine(prev => ({
        ...prev,
        exercises: [...prev.exercises, exercise]
      }));
    } else {
      setNewRoutine(prev => ({
        ...prev,
        exercises: [...prev.exercises, exercise]
      }));
    }
  };

  const handleUpdateExercise = (index, value) => {
    if (showEditModal) {
      const updatedExercises = [...editingRoutine.exercises];
      updatedExercises[index] = value;
      setEditingRoutine(prev => ({
        ...prev,
        exercises: updatedExercises
      }));
    } else {
      const updatedExercises = [...newRoutine.exercises];
      updatedExercises[index] = value;
      setNewRoutine(prev => ({
        ...prev,
        exercises: updatedExercises
      }));
    }
  };

  const handleRemoveExercise = (index) => {
    if (showEditModal) {
      setEditingRoutine(prev => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index)
      }));
    } else {
      setNewRoutine(prev => ({
        ...prev,
        exercises: prev.exercises.filter((_, i) => i !== index)
      }));
    }
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine({ ...routine });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRoutine.name.trim()) {
      Alert.alert('Error', 'Por favor, ingresa un nombre para la rutina');
      return;
    }

    const validExercises = editingRoutine.exercises.filter(ex => ex.trim());
    if (validExercises.length === 0) {
      Alert.alert('Error', 'Añade al menos un ejercicio');
      return;
    }

    const updatedRoutines = routines.map(routine => 
      routine.id === editingRoutine.id 
        ? { ...editingRoutine, exercises: validExercises }
        : routine
    );

    try {
      await saveCustomRoutine({ ...editingRoutine, exercises: validExercises });
      setRoutines(updatedRoutines);
      setShowEditModal(false);
      setEditingRoutine(null);
    } catch (error) {
      console.error('Error saving edited routine:', error);
      Alert.alert('Error', 'No se pudo guardar la rutina');
    }
  };

  const handleSaveRoutine = async () => {
    if (!newRoutine.name.trim()) {
      Alert.alert('Error', 'Por favor, ingresa un nombre para la rutina');
      return;
    }

    const validExercises = newRoutine.exercises.filter(ex => ex.trim());
    if (validExercises.length === 0) {
      Alert.alert('Error', 'Añade al menos un ejercicio');
      return;
    }

    const routineToSave = {
      name: newRoutine.name.trim(),
      exercises: validExercises
    };

    const success = await saveCustomRoutine(routineToSave);
    if (success) {
      setShowCreateModal(false);
      setNewRoutine({ name: '', exercises: [''] });
      loadRoutines();
    } else {
      Alert.alert('Error', 'No se pudo guardar la rutina');
    }
  };

  const handleDeleteRoutine = (routineId) => {
    Alert.alert(
      "Eliminar Rutina",
      "¿Estás seguro de que quieres eliminar esta rutina?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const success = await deleteCustomRoutine(routineId);
            if (success) {
              loadRoutines();
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {routines.map((routine) => (
          <Card key={routine.id} style={styles.card}>
            <Card.Content>
              <View style={styles.routineHeader}>
                <Title>{routine.name}</Title>
                <View style={styles.headerButtons}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => handleEditRoutine(routine)}
                    style={styles.editButton}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteRoutine(routine.id)}
                  />
                </View>
              </View>
              <List.Section>
                {routine.exercises.map((exercise, index) => (
                  <List.Item
                    key={index}
                    title={exercise}
                    left={props => <List.Icon {...props} icon="dumbbell" />}
                  />
                ))}
              </List.Section>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => {
                  console.log('Routine being used:', routine);
                  console.log('Routine ID type:', typeof routine.id);
                  console.log('Routine ID value:', routine.id);
                  router.push({
                    pathname: 'workout',
                    params: { routineId: String(routine.id) }
                  });
                }}
              >
                Usar esta rutina
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>Nueva Rutina</Title>
            <TextInput
              label="Nombre de la rutina"
              value={newRoutine.name}
              onChangeText={text => setNewRoutine(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />
            
            {newRoutine.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <TextInput
                  label={`Ejercicio ${index + 1}`}
                  value={exercise}
                  onChangeText={text => handleUpdateExercise(index, text)}
                  style={styles.exerciseInput}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleRemoveExercise(index)}
                />
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={() => handleAddExercise()}
              style={styles.addButton}
            >
              Añadir Ejercicio
            </Button>

            <Title style={styles.modalTitle}>Ejercicios Disponibles</Title>
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
                    onPress={() => handleAddExercise(exercise)}
                    right={props => <List.Icon {...props} icon="plus" />}
                  />
                ))}
              </List.Accordion>
            ))}

            <Button
              mode="contained"
              onPress={handleSaveRoutine}
              style={styles.saveButton}
            >
              Guardar Rutina
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => {
            setShowEditModal(false);
            setEditingRoutine(null);
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Title style={styles.modalTitle}>Editar Rutina</Title>
            <TextInput
              label="Nombre de la rutina"
              value={editingRoutine?.name || ''}
              onChangeText={text => setEditingRoutine(prev => ({ ...prev, name: text }))}
              style={styles.input}
            />
            
            {editingRoutine?.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseRow}>
                <TextInput
                  label={`Ejercicio ${index + 1}`}
                  value={exercise}
                  onChangeText={text => handleUpdateExercise(index, text)}
                  style={styles.exerciseInput}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleRemoveExercise(index)}
                />
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={() => handleAddExercise()}
              style={styles.addButton}
            >
              Añadir Ejercicio
            </Button>

            <Title style={styles.modalTitle}>Ejercicios Disponibles</Title>
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
                    onPress={() => handleAddExercise(exercise)}
                    right={props => <List.Icon {...props} icon="plus" />}
                  />
                ))}
              </List.Accordion>
            ))}

            <Button
              mode="contained"
              onPress={handleSaveEdit}
              style={styles.saveButton}
            >
              Guardar Cambios
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowCreateModal(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
    backgroundColor: 'white',
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  input: {
    marginBottom: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    marginVertical: 8,
  },
  saveButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  accordion: {
    backgroundColor: 'white',
    marginBottom: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    marginRight: 4,
  },
});
