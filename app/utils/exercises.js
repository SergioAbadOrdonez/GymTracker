export const EXERCISE_GROUPS = {
  'Pecho': {
    name: 'Pecho',
    exercises: [
      'Press de Banca',
      'Press Inclinado',
      'Press Declinado',
      'Aperturas',
      'Crucifijo',
      'Press con Mancuernas',
      'Flexiones',
      'Press Smith'
    ]
  },
  'Espalda': {
    name: 'Espalda',
    exercises: [
      'Dominadas',
      'Remo con Barra',
      'Jalón al Pecho',
      'Jalón Tras Nuca',
      'Jalón Prono',
      'Jalón Supino',
      'Jalón Unilateral',
      'Jalón Cerrado',
      'Jalón Abierto',
      'Remo con Mancuernas',
      'Remo en Máquina',
      'Superman',
      'Peso Muerto Rumano',
      'Pullover'
    ]
  },
  'Hombros': {
    name: 'Hombros',
    exercises: [
      'Press Militar',
      'Elevaciones Laterales',
      'Elevaciones Frontales',
      'Pájaros',
      'Press Arnold',
      'Face Pull',
      'Rotaciones Externas',
      'Shrugs'
    ]
  },
  'Bíceps': {
    name: 'Bíceps',
    exercises: [
      'Curl de Bíceps',
      'Curl con Mancuernas',
      'Curl Martillo',
      'Curl en Banco Scott',
      'Curl en Polea',
      'Curl Zottman',
      'Curl Concentrado',
      'Curl Spider'
    ]
  },
  'Tríceps': {
    name: 'Tríceps',
    exercises: [
      'Extensiones de Tríceps',
      'Fondos en Paralelas',
      'Press Francés',
      'Extensiones en Polea',
      'Extensiones con Mancuernas',
      'Extensiones en Banco',
      'Extensiones Overhead',
      'Extensiones en Máquina'
    ]
  },
  'Piernas': {
    name: 'Piernas',
    exercises: [
      'Sentadilla',
      'Peso Muerto',
      'Prensa',
      'Extensiones',
      'Curl Femoral',
      'Zancadas',
      'Elevación de Gemelos',
      'Sentadilla Búlgara'
    ]
  },
  'Core': {
    name: 'Core',
    exercises: [
      'Plancha',
      'Crunches',
      'Russian Twist',
      'Mountain Climbers',
      'Leg Raises',
      'Plank con Rotación',
      'Ab Rollout',
      'Side Plank'
    ]
  }
};

// Función para obtener todos los ejercicios de un grupo
export const getExercisesByGroup = (groupName) => {
  return EXERCISE_GROUPS[groupName]?.exercises || [];
};

// Función para obtener todos los grupos musculares
export const getMuscleGroups = () => {
  return Object.keys(EXERCISE_GROUPS);
};

// Función para obtener el grupo muscular de un ejercicio
export const getExerciseGroup = (exerciseName) => {
  for (const [groupName, group] of Object.entries(EXERCISE_GROUPS)) {
    if (group.exercises.includes(exerciseName)) {
      return groupName;
    }
  }
  return null;
}; 