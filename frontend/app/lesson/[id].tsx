import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../utils/api';
import { Lesson, Exercise } from '../../types';
import { Button } from '../../components/Button';
import { FoxMascot } from '../../components/FoxMascot';
import { LessonCompletionScreen } from '../../components/LessonCompletionScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Progress from 'react-native-progress';
import { useAuth } from '../../contexts/AuthContext';

export default function LessonDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<{[key: string]: string}>({});
  const [selectedForMatch, setSelectedForMatch] = useState<{side: 'left' | 'right', value: string} | null>(null);
  const [feedback, setFeedback] = useState<{correct: boolean, message: string} | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showVocabulary, setShowVocabulary] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);

  // Show completion screen if lesson is done
  if (showCompletion && completionData) {
    return (
      <LessonCompletionScreen
        {...completionData}
        onContinue={() => {
          router.push('/(tabs)/home');
        }}
        onReview={() => {
          // Reset to review wrong answers
          setShowCompletion(false);
          setShowVocabulary(false);
          setCurrentExerciseIndex(0);
          setCorrectAnswers(0);
          setFeedback(null);
        }}
      />
    );
  }

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      const data = await api.getLesson(id as string);
      setLesson(data);
    } catch (error) {
      Alert.alert('Hata', 'Ders yüklenemedi');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string) => {
    Speech.speak(text, {
      language: 'ro-RO',
      pitch: 1.0,
      rate: 0.85,
    });
  };

  const handleSubmitAnswer = async () => {
    if (!lesson) return;

    const exercise = lesson.exercises[currentExerciseIndex];
    let answer = '';

    // Prepare answer based on exercise type
    if (exercise.type === 'multiple_choice' || exercise.type === 'sentence_complete') {
      answer = selectedOption || '';
    } else if (exercise.type === 'word_match') {
      // For word match, check if all pairs are matched
      const allMatched = Object.keys(matchedPairs).length === exercise.pairs?.length;
      if (!allMatched) {
        Alert.alert('Uyarı', 'Lütfen tüm kelimeleri eşleştirin');
        return;
      }
      // Check if matches are correct
      const correct = exercise.pairs?.every(pair => 
        matchedPairs[pair.romanian] === pair.turkish
      );
      answer = correct ? 'correct' : 'incorrect';
    } else {
      answer = userAnswer.trim();
    }

    if (!answer) {
      Alert.alert('Uyarı', 'Lütfen bir cevap girin');
      return;
    }

    try {
      const result = await api.submitExercise(
        lesson.id,
        currentExerciseIndex,
        answer
      );

      setFeedback({
        correct: result.correct,
        message: result.correct
          ? '✅ Doğru cevap!'
          : `❌ Yanlış. Doğru cevap: ${result.correct_answer}\n${result.explanation || ''}`,
      });

      if (result.correct) {
        setCorrectAnswers(prev => prev + 1);
      }

      // Auto proceed to next after 2 seconds
      setTimeout(() => {
        if (currentExerciseIndex < lesson.exercises.length - 1) {
          nextExercise();
        } else {
          completeLesson();
        }
      }, 2000);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Cevap gönderilemedi');
    }
  };

  const nextExercise = () => {
    setCurrentExerciseIndex(prev => prev + 1);
    setUserAnswer('');
    setSelectedOption(null);
    setMatchedPairs({});
    setSelectedForMatch(null);
    setFeedback(null);
  };

  const completeLesson = async () => {
    if (!lesson || !user) return;

    const score = Math.round((correctAnswers / lesson.exercises.length) * 100);
    const lessonXP = 50;
    const accuracyBonus = score === 100 ? 20 : score >= 80 ? 10 : 0;
    const totalXP = lessonXP + accuracyBonus;

    try {
      const result = await api.completeLesson(lesson.id, score);
      const oldLevel = user.level;
      await refreshUser();
      
      // Check if leveled up
      const newUser = await api.getProfile();
      const didLevelUp = newUser.level > oldLevel;

      // Show completion screen
      setCompletionData({
        totalQuestions: lesson.exercises.length,
        correctAnswers,
        totalXP: result.xp_earned || totalXP,
        lessonXP,
        accuracyBonus,
        didLevelUp,
        newLevel: didLevelUp ? newUser.level : undefined,
      });
      setShowCompletion(true);
    } catch (error) {
      console.error('Failed to complete lesson:', error);
      Alert.alert('Hata', 'Ders tamamlanamadı');
    }
  };

  const handleWordMatch = (side: 'left' | 'right', value: string) => {
    if (selectedForMatch === null) {
      setSelectedForMatch({ side, value });
    } else {
      if (selectedForMatch.side === side) {
        // Same side clicked, deselect
        setSelectedForMatch({ side, value });
      } else {
        // Different sides, create match
        const leftValue = side === 'left' ? value : selectedForMatch.value;
        const rightValue = side === 'right' ? value : selectedForMatch.value;
        
        setMatchedPairs(prev => ({
          ...prev,
          [leftValue]: rightValue,
        }));
        setSelectedForMatch(null);
      }
    }
  };

  const renderExercise = (exercise: Exercise) => {
    switch (exercise.type) {
      case 'multiple_choice':
      case 'sentence_complete':
        return (
          <View style={styles.exerciseContainer}>
            <Text style={styles.question}>{exercise.question}</Text>
            <View style={styles.optionsContainer}>
              {exercise.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    selectedOption === option && styles.selectedOption,
                  ]}
                  onPress={() => setSelectedOption(option)}
                  disabled={!!feedback}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedOption === option && styles.selectedOptionText,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'word_match':
        return (
          <View style={styles.exerciseContainer}>
            <Text style={styles.question}>{exercise.question}</Text>
            <View style={styles.matchContainer}>
              <View style={styles.matchColumn}>
                {exercise.pairs?.map((pair, index) => {
                  const isMatched = matchedPairs[pair.romanian];
                  const isSelected = selectedForMatch?.value === pair.romanian;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.matchButton,
                        isMatched && styles.matchedButton,
                        isSelected && styles.selectedMatchButton,
                      ]}
                      onPress={() => !isMatched && handleWordMatch('left', pair.romanian)}
                      disabled={!!feedback || isMatched}
                    >
                      <Text style={styles.matchText}>{pair.romanian}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.matchColumn}>
                {exercise.pairs?.map((pair, index) => {
                  const isMatched = Object.values(matchedPairs).includes(pair.turkish);
                  const isSelected = selectedForMatch?.value === pair.turkish;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.matchButton,
                        isMatched && styles.matchedButton,
                        isSelected && styles.selectedMatchButton,
                      ]}
                      onPress={() => !isMatched && handleWordMatch('right', pair.turkish)}
                      disabled={!!feedback || isMatched}
                    >
                      <Text style={styles.matchText}>{pair.turkish}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case 'translation':
        return (
          <View style={styles.exerciseContainer}>
            <Text style={styles.question}>{exercise.question}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Cevabını yaz..."
              value={userAnswer}
              onChangeText={setUserAnswer}
              autoCapitalize="none"
              editable={!feedback}
            />
          </View>
        );

      case 'listening':
        return (
          <View style={styles.exerciseContainer}>
            <Text style={styles.question}>{exercise.question}</Text>
            <TouchableOpacity
              style={styles.audioButton}
              onPress={() => exercise.audio_text && speakText(exercise.audio_text)}
            >
              <MaterialCommunityIcons name="volume-high" size={40} color="#1CB0F6" />
              <Text style={styles.audioText}>Dinle</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Duyduğunu yaz..."
              value={userAnswer}
              onChangeText={setUserAnswer}
              autoCapitalize="none"
              editable={!feedback}
            />
          </View>
        );

      case 'speaking':
        return (
          <View style={styles.exerciseContainer}>
            <Text style={styles.question}>{exercise.question}</Text>
            <View style={styles.speakingHint}>
              <MaterialCommunityIcons name="information" size={20} color="#1CB0F6" />
              <Text style={styles.hintText}>
                Telaffuz: {exercise.pronunciation_guide}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.audioButton}
              onPress={() => exercise.correct_answer && speakText(exercise.correct_answer)}
            >
              <MaterialCommunityIcons name="account-voice" size={40} color="#58CC02" />
              <Text style={styles.audioText}>Örnek Dinle</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Cevabını yaz..."
              value={userAnswer}
              onChangeText={setUserAnswer}
              autoCapitalize="none"
              editable={!feedback}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1CB0F6" />
      </View>
    );
  }

  if (!lesson) return null;

  // Show vocabulary first
  if (showVocabulary) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lesson.title}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.mascotContainer}>
            <FoxMascot expression="thinking" size={100} showMessage="Önce kelimeleri öğrenelim!" />
          </View>

          <View style={styles.vocabSection}>
            <Text style={styles.sectionTitle}>📚 Kelimeler</Text>
            {lesson.vocabulary.map((item, index) => (
              <View key={index} style={styles.vocabCard}>
                <View style={styles.vocabHeader}>
                  <Text style={styles.vocabRomanian}>{item.romanian}</Text>
                  <TouchableOpacity onPress={() => speakText(item.romanian)}>
                    <MaterialCommunityIcons name="volume-high" size={24} color="#1CB0F6" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.vocabTurkish}>{item.turkish}</Text>
                <Text style={styles.vocabPronunciation}>{item.pronunciation}</Text>
              </View>
            ))}
          </View>

          {lesson.grammar_tip && (
            <View style={styles.grammarSection}>
              <Text style={styles.sectionTitle}>💡 Gramer İpucu</Text>
              <Text style={styles.grammarText}>{lesson.grammar_tip}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title="Alıştırmalara Başla"
              onPress={() => setShowVocabulary(false)}
              variant="success"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show exercises
  const currentExercise = lesson.exercises[currentExerciseIndex];
  const progress = (currentExerciseIndex + 1) / lesson.exercises.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={progress}
            width={null}
            height={8}
            color="#58CC02"
            unfilledColor="#E5E5E5"
            borderWidth={0}
            borderRadius={4}
          />
        </View>
        <Text style={styles.exerciseCount}>
          {currentExerciseIndex + 1}/{lesson.exercises.length}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!feedback && (
          <View style={styles.foxContainer}>
            <FoxMascot expression="thinking" size={80} />
          </View>
        )}

        {renderExercise(currentExercise)}

        {feedback && (
          <View style={[styles.feedbackContainer, feedback.correct ? styles.correctFeedback : styles.incorrectFeedback]}>
            <FoxMascot expression={feedback.correct ? 'excited' : 'sad'} size={60} />
            <Text style={styles.feedbackText}>{feedback.message}</Text>
          </View>
        )}

        {!feedback && (
          <View style={styles.submitContainer}>
            <Button
              title="Kontrol Et"
              onPress={handleSubmitAnswer}
              variant="success"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  exerciseCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  foxContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  vocabSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  vocabCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  vocabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vocabRomanian: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1CB0F6',
  },
  vocabTurkish: {
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  vocabPronunciation: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  grammarSection: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  grammarText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  exerciseContainer: {
    marginBottom: 24,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
  },
  selectedOption: {
    borderColor: '#1CB0F6',
    backgroundColor: '#F0F9FF',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#1CB0F6',
    fontWeight: '600',
  },
  matchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  matchColumn: {
    flex: 1,
    gap: 12,
  },
  matchButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  matchedButton: {
    borderColor: '#58CC02',
    backgroundColor: '#F0FFF0',
  },
  selectedMatchButton: {
    borderColor: '#1CB0F6',
    backgroundColor: '#F0F9FF',
  },
  matchText: {
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  audioButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  audioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  speakingHint: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  feedbackContainer: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  correctFeedback: {
    backgroundColor: '#E8F5E9',
  },
  incorrectFeedback: {
    backgroundColor: '#FFEBEE',
  },
  feedbackText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  submitContainer: {
    marginTop: 24,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
});
