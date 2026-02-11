import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { UserStatsHeader } from '../../components/UserStatsHeader';
import { Button } from '../../components/Button';
import { SkeletonShopCard } from '../../components/SkeletonLoaders';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface ShopItem {
  id: string;
  item_type: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: string;
}

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    try {
      const data = await api.getShop();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to load shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShop();
    await refreshUser();
    setRefreshing(false);
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;

    if (user.gems < item.price) {
      Alert.alert('Yetersiz Gem', 'Bu eşyayı almak için yeterli gem\'iniz yok!');
      return;
    }

    Alert.alert(
      'Satın Al',
      `${item.name} satın almak istediğinizden emin misiniz? (${item.price} 💎)`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Satın Al',
          onPress: async () => {
            setPurchasing(item.id);
            try {
              await api.purchaseItem(item.id);
              await refreshUser();
              Alert.alert('Başarılı!', `${item.name} satın alındı!`);
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Satın alma başarısız');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const getIconComponent = (icon: string) => {
    const iconMap: { [key: string]: string } = {
      '❤️': 'cards-heart',
      '🧊': 'snowflake',
      '⚡': 'lightning-bolt',
      '💗': 'heart-plus',
    };
    return iconMap[icon] || 'shopping';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'consumable': return ['#FF6B6B', '#EE5A6F'];
      case 'power_up': return ['#4ECDC4', '#44A08D'];
      case 'permanent': return ['#FFA500', '#FF8C00'];
      default: return Colors.gradientPrimary;
    }
  };

  const renderItem = ({ item }: { item: ShopItem }) => (
    <View style={styles.itemCard}>
      <LinearGradient
        colors={getCategoryColor(item.category)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.itemHeader}
      >
        <MaterialCommunityIcons 
          name={getIconComponent(item.icon)} 
          size={48} 
          color="white" 
        />
      </LinearGradient>

      <View style={styles.itemContent}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>

        <View style={styles.itemFooter}>
          <View style={styles.priceContainer}>
            <MaterialCommunityIcons name="diamond-stone" size={20} color={Colors.secondary} />
            <Text style={styles.priceText}>{item.price}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.buyButton,
              purchasing === item.id && styles.buyButtonDisabled,
            ]}
            onPress={() => handlePurchase(item)}
            disabled={purchasing === item.id}
          >
            <Text style={styles.buyButtonText}>
              {purchasing === item.id ? 'Satın Alınıyor...' : 'Satın Al'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏪 Mağaza</Text>
        <UserStatsHeader
          hearts={user.hearts}
          maxHearts={user.max_hearts}
          gems={user.gems}
          streak={user.streak}
        />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="shopping-outline" size={80} color={Colors.textLight} />
            <Text style={styles.emptyText}>Mağaza yükleniyor...</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  itemHeader: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    padding: 20,
  },
  itemName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  buyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  buyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});
