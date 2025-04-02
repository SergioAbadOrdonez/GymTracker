import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../../firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

// Claves para el almacenamiento
const STORAGE_KEYS = {
  WORKOUTS: '@gym_tracker_workouts',
  EXERCISES: '@gym_tracker_exercises',
  CUSTOM_ROUTINES: '@gym_tracker_custom_routines'
};

/**
 * Guarda un entrenamiento en el almacenamiento
 * @param {Object} workout - El entrenamiento a guardar
 * @returns {Promise<boolean>} - true si se guardó correctamente, false si hubo error
 */
export const saveWorkout = async (workout) => {
  try {
    // Obtener workouts existentes
    const existingWorkouts = await getWorkouts();
    
    // Añadir el nuevo workout
    const updatedWorkouts = [...existingWorkouts, {
      ...workout,
      id: Date.now(), // Usar timestamp como ID
      date: new Date().toISOString(),
    }];
    
    // Guardar workouts actualizados
    await AsyncStorage.setItem(
      STORAGE_KEYS.WORKOUTS, 
      JSON.stringify(updatedWorkouts)
    );
    
    return true;
  } catch (error) {
    console.error('Error saving workout:', error);
    return false;
  }
};

/**
 * Obtiene todos los entrenamientos guardados
 * @returns {Promise<Array>} - Array de entrenamientos
 */
export const getWorkouts = async () => {
  try {
    const workouts = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS);
    return workouts ? JSON.parse(workouts) : [];
  } catch (error) {
    console.error('Error getting workouts:', error);
    return [];
  }
};

/**
 * Obtiene las estadísticas de un ejercicio específico
 * @param {string} exerciseName - Nombre del ejercicio
 * @returns {Promise<Object|null>} - Estadísticas del ejercicio
 */
export const getExerciseStats = async (exerciseName) => {
  try {
    const workouts = await getWorkouts();
    
    // Filtrar todos los sets del ejercicio específico
    const exerciseSets = workouts.flatMap(workout =>
      workout.exercises
        .filter(exercise => exercise.name === exerciseName)
        .flatMap(exercise => exercise.sets.map(set => ({
          ...set,
          date: workout.date
        })))
    );

    if (exerciseSets.length === 0) return null;

    // Calcular estadísticas
    const stats = {
      maxWeight: Math.max(...exerciseSets.map(set => parseFloat(set.weight) || 0)),
      lastWeight: exerciseSets[exerciseSets.length - 1].weight,
      history: workouts
        .filter(workout => 
          workout.exercises.some(exercise => exercise.name === exerciseName)
        )
        .map(workout => {
          const exercise = workout.exercises.find(e => e.name === exerciseName);
          const maxWeight = Math.max(...exercise.sets.map(set => parseFloat(set.weight) || 0));
          return {
            date: workout.date,
            weight: maxWeight
          };
        }),
      personalBest: exerciseSets.reduce((best, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        if (weight > (best.weight || 0)) {
          return { weight, reps, date: set.date };
        }
        return best;
      }, { weight: 0, reps: 0, date: null }),
      averageReps: Math.round(
        exerciseSets.reduce((sum, set) => sum + (parseInt(set.reps) || 0), 0) / 
        exerciseSets.length
      ),
      totalVolume: exerciseSets.reduce((sum, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;
        return sum + (weight * reps);
      }, 0),
      frequencyPerMonth: Math.round(
        (new Set(exerciseSets.map(set => set.date.slice(0, 10))).size / 
        ((Date.now() - new Date(exerciseSets[0].date).getTime()) / 
        (30 * 24 * 60 * 60 * 1000))) * 30
      )
    };

    return stats;
  } catch (error) {
    console.error('Error getting exercise stats:', error);
    return null;
  }
};

/**
 * Elimina un entrenamiento específico
 * @param {number} workoutId - ID del entrenamiento a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente, false si hubo error
 */
export const deleteWorkout = async (workoutId) => {
  try {
    const workouts = await getWorkouts();
    const updatedWorkouts = workouts.filter(workout => workout.id !== workoutId);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(updatedWorkouts));
    return true;
  } catch (error) {
    console.error('Error deleting workout:', error);
    return false;
  }
};

/**
 * Limpia todos los datos almacenados
 * @returns {Promise<boolean>} - true si se limpió correctamente, false si hubo error
 */
export const clearAllData = async () => {
  try {
    // Borrar todos los datos almacenados
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.WORKOUTS,
      STORAGE_KEYS.EXERCISES,
      STORAGE_KEYS.CUSTOM_ROUTINES,
      '@gym_tracker_stats',  // Añadir clave para estadísticas
      '@gym_tracker_progress'  // Añadir clave para progreso
    ]);
    
    // Limpiar cualquier otro dato en caché
    await AsyncStorage.clear();
    
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};

/**
 * Sincroniza los entrenamientos con la nube
 */
export const syncWithCloud = async () => {
  try {
    // Verificar si el usuario está autenticado
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener entrenamientos locales
    const localWorkouts = await getWorkouts();
    
    // Obtener entrenamientos de la nube
    const cloudWorkouts = [];
    const q = query(
      collection(db, 'workouts'), 
      where('userId', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      cloudWorkouts.push({ id: doc.id, ...doc.data() });
    });

    // Sincronizar datos
    for (const workout of localWorkouts) {
      if (!cloudWorkouts.find(cw => cw.id === workout.id)) {
        // Subir a la nube si no existe
        await addDoc(collection(db, 'workouts'), {
          ...workout,
          userId: user.uid,
          syncedAt: new Date().toISOString()
        });
      }
    }

    // Descargar entrenamientos nuevos de la nube
    for (const cloudWorkout of cloudWorkouts) {
      if (!localWorkouts.find(lw => lw.id === cloudWorkout.id)) {
        localWorkouts.push(cloudWorkout);
      }
    }

    // Actualizar almacenamiento local
    await AsyncStorage.setItem(
      STORAGE_KEYS.WORKOUTS,
      JSON.stringify(localWorkouts)
    );

    return true;
  } catch (error) {
    console.error('Error syncing with cloud:', error);
    return false;
  }
};

/**
 * Restaura los datos desde la nube
 */
export const restoreFromCloud = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const cloudWorkouts = [];
    const q = query(
      collection(db, 'workouts'), 
      where('userId', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      cloudWorkouts.push({ id: doc.id, ...doc.data() });
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.WORKOUTS,
      JSON.stringify(cloudWorkouts)
    );

    return true;
  } catch (error) {
    console.error('Error restoring from cloud:', error);
    return false;
  }
};

// Función para guardar una rutina personalizada
export const saveCustomRoutine = async (routine) => {
  try {
    const existingRoutines = await getCustomRoutines();
    console.log('Existing routines:', existingRoutines);
    
    const newRoutine = {
      ...routine,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    console.log('New routine to save:', newRoutine);
    const updatedRoutines = [...existingRoutines, newRoutine];
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.CUSTOM_ROUTINES,
      JSON.stringify(updatedRoutines)
    );
    
    console.log('Saved routines:', updatedRoutines);
    return true;
  } catch (error) {
    console.error('Error saving custom routine:', error);
    return false;
  }
};

// Función para obtener todas las rutinas personalizadas
export const getCustomRoutines = async () => {
  try {
    const routines = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_ROUTINES);
    return routines ? JSON.parse(routines) : [];
  } catch (error) {
    console.error('Error getting custom routines:', error);
    return [];
  }
};

// Función para eliminar una rutina personalizada
export const deleteCustomRoutine = async (routineId) => {
  try {
    const routines = await getCustomRoutines();
    const updatedRoutines = routines.filter(routine => routine.id !== routineId);
    await AsyncStorage.setItem(
      STORAGE_KEYS.CUSTOM_ROUTINES,
      JSON.stringify(updatedRoutines)
    );
    return true;
  } catch (error) {
    console.error('Error deleting custom routine:', error);
    return false;
  }
}; 