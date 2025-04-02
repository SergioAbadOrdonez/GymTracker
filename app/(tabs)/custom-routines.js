import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, TextInput, Button, List, FAB, Portal, Modal, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { saveCustomRoutine, getCustomRoutines, deleteCustomRoutine } from '../utils/storage';

export default function CustomRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleAddExercise = () => {
    setNewRoutine(prev => ({
      ...prev,
      exercises: [...prev.exercises, '']
    }));
  };

  const handleUpdateExercise = (index, value) => {
    const updatedExercises = [...newRoutine.exercises];
    updatedExercises[index] = value;
    setNewRoutine(prev => ({
      ...prev,
      exercises: updatedExercises
    }));
  };

  const handleRemoveExercise = (index) => {
    setNewRoutine(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
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
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteRoutine(routine.id)}
                />
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
                onPress={() => router.push({
                  pathname: 'workout',
                  params: { routineId: routine.id }
                })}
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
              onPress={handleAddExercise}
              style={styles.addButton}
            >
              Añadir Ejercicio
            </Button>

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
});
