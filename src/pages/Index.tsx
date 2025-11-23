import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Booba {
  id: string;
  name: string;
  rarity: 'legendary' | 'rare' | 'common' | 'invisible';
  image?: string;
  chance: number;
  reward: number;
}

interface CollectionItem extends Booba {
  count: number;
  firstUnlocked: string;
}

const boobas: Booba[] = [
  {
    id: 'cool-booba',
    name: 'Крутой Буба',
    rarity: 'legendary',
    image: 'https://cdn.poehali.dev/files/bbc52363-7edd-421d-b704-16291f10f9b4.jpg',
    chance: 5,
    reward: 500
  },
  {
    id: 'laughing-booba',
    name: 'Смеющийся Буба',
    rarity: 'rare',
    image: 'https://cdn.poehali.dev/files/328f4730-f1e2-45c6-bc03-ca94d18b5ffd.jpg',
    chance: 13,
    reward: 150
  },
  {
    id: 'sad-booba',
    name: 'Грустный Буба',
    rarity: 'rare',
    image: 'https://cdn.poehali.dev/files/5f53971d-d15f-4de0-9a09-f5a52d8991c5.jpg',
    chance: 10,
    reward: 150
  },
  {
    id: 'invisible-booba',
    name: 'Невидимый Буба',
    rarity: 'invisible',
    chance: 7,
    reward: -30
  },
  {
    id: 'regular-booba',
    name: 'Обычный Буба',
    rarity: 'common',
    image: 'https://cdn.poehali.dev/files/506d5ba0-644a-4c64-a200-0715bb43c72b.jpg',
    chance: 45,
    reward: 90
  },
  {
    id: 'sleepy-booba',
    name: 'Спящий Буба',
    rarity: 'common',
    image: 'https://cdn.poehali.dev/files/559f0072-6940-41a7-b372-f0dd81de24e5.jpg',
    chance: 20,
    reward: 90
  }
];

const rarityConfig = {
  legendary: {
    color: 'text-legendary',
    bgColor: 'bg-legendary/20',
    borderColor: 'border-legendary',
    label: 'ЛЕГЕНДАРНЫЙ'
  },
  rare: {
    color: 'text-rare',
    bgColor: 'bg-rare/20',
    borderColor: 'border-rare',
    label: 'РЕДКИЙ'
  },
  common: {
    color: 'text-common',
    bgColor: 'bg-common/20',
    borderColor: 'border-common',
    label: 'ОБЫЧНЫЙ'
  },
  invisible: {
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive',
    label: 'НЕВИДИМЫЙ'
  }
};

const MARKETPLACE_API = 'https://functions.poehali.dev/eb27b962-8c84-415e-afc2-2225a4581d70';

interface MarketplaceListing {
  listing_id: number;
  seller_id: string;
  booba_id: string;
  price: number;
  created_at: string;
}

const Index = () => {
  const [isOpening, setIsOpening] = useState(false);
  const [currentBooba, setCurrentBooba] = useState<Booba | null>(null);
  const [collection, setCollection] = useState<Record<string, CollectionItem>>({});
  const [totalOpened, setTotalOpened] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [bubix, setBubix] = useState(200);
  const [playerId] = useState(() => {
    let id = localStorage.getItem('booba-player-id');
    if (!id) {
      id = 'player_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('booba-player-id', id);
    }
    return id;
  });
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [sellPrice, setSellPrice] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadFromServer();
    loadListings();
  }, []);

  const loadFromServer = async () => {
    try {
      const response = await fetch(`${MARKETPLACE_API}?action=inventory&player_id=${playerId}`);
      const data = await response.json();
      
      if (data.inventory && data.inventory.length > 0) {
        const serverCollection: Record<string, CollectionItem> = {};
        
        data.inventory.forEach((item: { booba_id: string; count: number }) => {
          const boobaData = boobas.find(b => b.id === item.booba_id);
          if (boobaData) {
            serverCollection[item.booba_id] = {
              ...boobaData,
              count: item.count,
              firstUnlocked: new Date().toISOString()
            };
          }
        });
        
        setCollection(serverCollection);
        setBubix(data.bubix || 200);
        
        localStorage.setItem('booba-collection', JSON.stringify(serverCollection));
        localStorage.setItem('booba-bubix', (data.bubix || 200).toString());
      } else {
        const savedCollection = localStorage.getItem('booba-collection');
        const savedBubix = localStorage.getItem('booba-bubix');
        
        if (savedCollection) {
          const localCollection = JSON.parse(savedCollection);
          setCollection(localCollection);
          const localBubix = savedBubix ? parseInt(savedBubix) : 200;
          setBubix(localBubix);
          await syncWithServer(localCollection, localBubix);
        }
      }
      
      const savedTotal = localStorage.getItem('booba-total-opened');
      if (savedTotal) {
        setTotalOpened(parseInt(savedTotal));
      }
    } catch (error) {
      console.error('Failed to load from server:', error);
      const savedCollection = localStorage.getItem('booba-collection');
      const savedTotal = localStorage.getItem('booba-total-opened');
      const savedBubix = localStorage.getItem('booba-bubix');
      
      if (savedCollection) setCollection(JSON.parse(savedCollection));
      if (savedTotal) setTotalOpened(parseInt(savedTotal));
      if (savedBubix) setBubix(parseInt(savedBubix));
    }
  };

  const syncWithServer = async (customCollection?: Record<string, CollectionItem>, customBubix?: number) => {
    try {
      const collectionToSync = customCollection !== undefined ? customCollection : collection;
      const bubixToSync = customBubix !== undefined ? customBubix : bubix;
      
      const inventoryData: Record<string, number> = {};
      Object.values(collectionToSync).forEach(item => {
        inventoryData[item.id] = item.count;
      });
      
      await fetch(MARKETPLACE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          player_id: playerId,
          bubix: bubixToSync,
          inventory: inventoryData
        })
      });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const loadListings = async () => {
    try {
      const response = await fetch(`${MARKETPLACE_API}?action=listings`);
      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
    }
  };

  const sellBooba = async (boobaId: string) => {
    const price = sellPrice[boobaId];
    if (!price || price < 1) {
      toast({
        title: '❌ Укажите цену',
        description: 'Цена должна быть больше 0',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await fetch(MARKETPLACE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sell',
          player_id: playerId,
          booba_id: boobaId,
          price
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const newCollection = { ...collection };
        if (newCollection[boobaId]) {
          newCollection[boobaId].count -= 1;
          if (newCollection[boobaId].count === 0) {
            delete newCollection[boobaId];
          }
        }
        setCollection(newCollection);
        saveProgress(newCollection, totalOpened, bubix);
        await syncWithServer(newCollection, bubix);
        
        toast({
          title: '✅ Выставлено на продажу',
          description: `${boobas.find(b => b.id === boobaId)?.name} за ${price} бубиксов`
        });
        
        loadListings();
        setSellPrice({ ...sellPrice, [boobaId]: 0 });
      } else {
        toast({
          title: '❌ Ошибка',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка сети',
        description: 'Не удалось выставить на продажу',
        variant: 'destructive'
      });
    }
  };

  const buyBooba = async (listingId: number) => {
    try {
      const response = await fetch(MARKETPLACE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          player_id: playerId,
          listing_id: listingId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        const listing = listings.find(l => l.listing_id === listingId);
        if (listing) {
          const newBubix = bubix - listing.price;
          const boobaData = boobas.find(b => b.id === data.booba_id);
          
          if (boobaData) {
            const newCollection = { ...collection };
            if (newCollection[data.booba_id]) {
              newCollection[data.booba_id].count += 1;
            } else {
              newCollection[data.booba_id] = {
                ...boobaData,
                count: 1,
                firstUnlocked: new Date().toISOString()
              };
            }
            setCollection(newCollection);
            setBubix(newBubix);
            saveProgress(newCollection, totalOpened, newBubix);
            await syncWithServer(newCollection, newBubix);
          }
          
          toast({
            title: '✅ Куплено!',
            description: `Вы купили ${boobas.find(b => b.id === data.booba_id)?.name}`
          });
          
          loadListings();
        }
      } else {
        toast({
          title: '❌ Ошибка',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '❌ Ошибка сети',
        description: 'Не удалось купить',
        variant: 'destructive'
      });
    }
  };

  const saveProgress = (newCollection: Record<string, CollectionItem>, newTotal: number, newBubix: number) => {
    localStorage.setItem('booba-collection', JSON.stringify(newCollection));
    localStorage.setItem('booba-total-opened', newTotal.toString());
    localStorage.setItem('booba-bubix', newBubix.toString());
  };

  const getRandomBooba = (): Booba => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const booba of boobas) {
      cumulative += booba.chance;
      if (random <= cumulative) {
        return booba;
      }
    }
    
    return boobas[boobas.length - 1];
  };

  const openCase = () => {
    if (isOpening) return;
    
    if (bubix < 50) {
      toast({
        title: '❌ Недостаточно бубиксов!',
        description: 'Нужно 50 бубиксов для открытия кейса',
        variant: 'destructive'
      });
      return;
    }
    
    setIsOpening(true);
    setShowResult(false);
    setCurrentBooba(null);
    
    const newBubix = bubix - 50;
    setBubix(newBubix);
    
    setTimeout(() => {
      const wonBooba = getRandomBooba();
      setCurrentBooba(wonBooba);
      
      const newCollection = { ...collection };
      const newTotal = totalOpened + 1;
      const finalBubix = newBubix + wonBooba.reward;
      
      if (newCollection[wonBooba.id]) {
        newCollection[wonBooba.id].count += 1;
      } else {
        newCollection[wonBooba.id] = {
          ...wonBooba,
          count: 1,
          firstUnlocked: new Date().toISOString()
        };
      }
      
      setCollection(newCollection);
      setTotalOpened(newTotal);
      setBubix(finalBubix);
      saveProgress(newCollection, newTotal, finalBubix);
      syncWithServer(newCollection, finalBubix);
      
      setTimeout(() => {
        setShowResult(true);
        setIsOpening(false);
        
        const rewardText = wonBooba.reward >= 0 ? `+${wonBooba.reward} бубиксов` : `${wonBooba.reward} бубиксов`;
        toast({
          title: wonBooba.rarity === 'legendary' ? '🎉 ЛЕГЕНДАРНЫЙ!' : wonBooba.rarity === 'rare' ? '✨ РЕДКИЙ!' : wonBooba.rarity === 'invisible' ? '👻 НЕВИДИМЫЙ!' : '✅ Получен!',
          description: `${wonBooba.name}! ${rewardText}`
        });
      }, 800);
    }, 500);
  };

  const collectionArray = Object.values(collection).sort((a, b) => {
    const rarityOrder = { legendary: 0, rare: 1, common: 2, invisible: 3 };
    return rarityOrder[a.rarity as keyof typeof rarityOrder] - rarityOrder[b.rarity as keyof typeof rarityOrder];
  });

  const stats = {
    total: collectionArray.reduce((sum, item) => sum + item.count, 0),
    unique: collectionArray.length,
    legendary: collectionArray.filter(b => b.rarity === 'legendary').length,
    rare: collectionArray.filter(b => b.rarity === 'rare').length,
    common: collectionArray.filter(b => b.rarity === 'common').length
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-legendary via-rare to-primary bg-clip-text text-transparent">
            Буба Кейсы
          </h1>
          <p className="text-muted-foreground text-lg">Собери коллекцию редких персонажей!</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Icon name="Coins" size={28} className="text-yellow-500" />
            <span className="text-3xl font-bold text-yellow-500">{bubix}</span>
            <span className="text-lg text-muted-foreground">бубиксов</span>
          </div>
          <div className="mt-4 text-sm text-muted-foreground/80">
            <p>Сделано <span className="text-destructive font-semibold">RED BUBA</span></p>
            <p className="flex items-center justify-center gap-2 mt-1">
              <Icon name="Send" size={14} />
              <a href="https://t.me/vocal_endr" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">@vocal_endr</a>
              <span>и</span>
              <a href="https://t.me/PinguinoPenguins" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">@PinguinoPenguins</a>
            </p>
            <p className="mt-1 text-xs">От сериала Буба против мессенджера MAX</p>
          </div>
        </div>

        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-8">
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Icon name="Package" size={18} />
              Кейсы
            </TabsTrigger>
            <TabsTrigger value="collection" className="flex items-center gap-2">
              <Icon name="Trophy" size={18} />
              Коллекция
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Icon name="Store" size={18} />
              Магазин
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Icon name="Package2" size={18} />
              Инвентарь
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="space-y-8">
            <div className="text-center space-y-6">
              <Card className="max-w-md mx-auto p-8 bg-card/50 backdrop-blur border-2">
                <div className="relative">
                  {!showResult ? (
                    <div>
                      <div 
                        className={`w-64 h-64 mx-auto bg-gradient-to-br from-primary/30 to-legendary/30 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                          isOpening ? 'animate-case-shake' : ''
                        }`}
                        onClick={openCase}
                      >
                        <Icon name="Package" size={100} className="text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">Стоимость: 50 бубиксов</p>
                    </div>
                  ) : currentBooba && (
                    <div className="animate-booba-appear">
                      <div className={`relative p-4 rounded-2xl border-4 ${rarityConfig[currentBooba.rarity].borderColor} ${rarityConfig[currentBooba.rarity].bgColor}`}>
                        <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${rarityConfig[currentBooba.rarity].color} bg-background border-2 ${rarityConfig[currentBooba.rarity].borderColor}`}>
                          {rarityConfig[currentBooba.rarity].label}
                        </Badge>
                        {currentBooba.rarity === 'invisible' ? (
                          <div className="w-64 h-64 mx-auto flex flex-col items-center justify-center text-center p-8">
                            <p className="text-xl font-bold text-muted-foreground mb-2">Его нету</p>
                            <p className="text-lg text-muted-foreground/80">он типа невидимый</p>
                            <Icon name="Ghost" size={60} className="text-muted-foreground/40 mt-4" />
                          </div>
                        ) : (
                          <img 
                            src={currentBooba.image} 
                            alt={currentBooba.name}
                            className="w-64 h-64 object-contain mx-auto animate-glow-pulse"
                            style={{ color: `hsl(var(--${currentBooba.rarity}))` }}
                          />
                        )}
                        <h3 className="text-2xl font-bold mt-4">{currentBooba.name}</h3>
                        <p className={`text-lg font-semibold mt-2 ${currentBooba.reward >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {currentBooba.reward >= 0 ? '+' : ''}{currentBooba.reward} бубиксов
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={openCase}
                  disabled={isOpening}
                  size="lg"
                  className="w-full mt-6 text-lg font-bold bg-gradient-to-r from-primary to-legendary hover:opacity-90 transition-opacity"
                >
                  {isOpening ? (
                    <>
                      <Icon name="Loader2" size={20} className="animate-spin mr-2" />
                      Открываем...
                    </>
                  ) : (
                    <>
                      <Icon name="Gift" size={20} className="mr-2" />
                      Открыть кейс
                    </>
                  )}
                </Button>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                <Card className="p-4 text-center bg-card/50 backdrop-blur">
                  <Icon name="Package" size={24} className="mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{totalOpened}</div>
                  <div className="text-sm text-muted-foreground">Открыто кейсов</div>
                </Card>
                <Card className="p-4 text-center bg-legendary/10 backdrop-blur border-legendary/50">
                  <div className="text-2xl mb-2">👑</div>
                  <div className="text-2xl font-bold text-legendary">{stats.legendary}</div>
                  <div className="text-sm text-muted-foreground">Легендарных</div>
                </Card>
                <Card className="p-4 text-center bg-rare/10 backdrop-blur border-rare/50">
                  <div className="text-2xl mb-2">✨</div>
                  <div className="text-2xl font-bold text-rare">{stats.rare}</div>
                  <div className="text-sm text-muted-foreground">Редких</div>
                </Card>
                <Card className="p-4 text-center bg-common/10 backdrop-blur border-common/50">
                  <div className="text-2xl mb-2">⚪</div>
                  <div className="text-2xl font-bold text-common">{stats.common}</div>
                  <div className="text-sm text-muted-foreground">Обычных</div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="collection">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Icon name="Library" size={28} />
                Моя коллекция
              </h2>
              
              {collectionArray.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="PackageOpen" size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Ваша коллекция пуста</p>
                  <p className="text-sm">Откройте кейс, чтобы получить первого Буба!</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collectionArray.map((item) => (
                      <Card 
                        key={item.id}
                        className={`p-4 border-2 ${rarityConfig[item.rarity].borderColor} ${rarityConfig[item.rarity].bgColor} transition-transform hover:scale-105`}
                      >
                        <Badge className={`mb-2 ${rarityConfig[item.rarity].color} bg-background/80`}>
                          {rarityConfig[item.rarity].label}
                        </Badge>
                        {item.rarity === 'invisible' ? (
                          <div className="w-full h-48 flex flex-col items-center justify-center text-center mb-3">
                            <p className="text-sm font-bold text-muted-foreground mb-1">Его нету</p>
                            <p className="text-xs text-muted-foreground/80">он типа невидимый</p>
                            <Icon name="Ghost" size={40} className="text-muted-foreground/40 mt-2" />
                          </div>
                        ) : (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-48 object-contain mb-3 rounded-lg"
                          />
                        )}
                        <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="Hash" size={14} />
                            Получено: {item.count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="Clock" size={14} />
                            {new Date(item.firstUnlocked).toLocaleDateString('ru')}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="marketplace">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Icon name="Store" size={28} />
                Магазин Буб
              </h2>
              
              <Button 
                onClick={loadListings}
                variant="outline"
                className="mb-6"
              >
                <Icon name="RefreshCw" size={16} className="mr-2" />
                Обновить
              </Button>

              {listings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="ShoppingCart" size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Магазин пуст</p>
                  <p className="text-sm">Пока никто не выставил Буб на продажу</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listings.map((listing) => {
                      const boobaData = boobas.find(b => b.id === listing.booba_id);
                      if (!boobaData) return null;
                      
                      const isMyListing = listing.seller_id === playerId;
                      
                      return (
                        <Card 
                          key={listing.listing_id}
                          className={`p-4 border-2 ${rarityConfig[boobaData.rarity].borderColor} ${rarityConfig[boobaData.rarity].bgColor}`}
                        >
                          <Badge className={`mb-2 ${rarityConfig[boobaData.rarity].color} bg-background/80`}>
                            {rarityConfig[boobaData.rarity].label}
                          </Badge>
                          {boobaData.rarity === 'invisible' ? (
                            <div className="w-full h-48 flex flex-col items-center justify-center text-center mb-3">
                              <p className="text-sm font-bold text-muted-foreground mb-1">Его нету</p>
                              <p className="text-xs text-muted-foreground/80">он типа невидимый</p>
                              <Icon name="Ghost" size={40} className="text-muted-foreground/40 mt-2" />
                            </div>
                          ) : (
                            <img 
                              src={boobaData.image} 
                              alt={boobaData.name}
                              className="w-full h-48 object-contain mb-3 rounded-lg"
                            />
                          )}
                          <h3 className="text-xl font-bold mb-2">{boobaData.name}</h3>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon name="Coins" size={18} className="text-yellow-500" />
                              <span className="text-xl font-bold text-yellow-500">{listing.price}</span>
                            </div>
                            {isMyListing && (
                              <Badge variant="secondary">Ваш лот</Badge>
                            )}
                          </div>
                          <Button 
                            onClick={() => buyBooba(listing.listing_id)}
                            disabled={isMyListing || bubix < listing.price}
                            className="w-full"
                            variant={isMyListing ? "outline" : "default"}
                          >
                            {isMyListing ? (
                              <>
                                <Icon name="User" size={16} className="mr-2" />
                                Ваш лот
                              </>
                            ) : bubix < listing.price ? (
                              <>
                                <Icon name="Ban" size={16} className="mr-2" />
                                Не хватает бубиксов
                              </>
                            ) : (
                              <>
                                <Icon name="ShoppingCart" size={16} className="mr-2" />
                                Купить
                              </>
                            )}
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Icon name="Package2" size={28} />
                Инвентарь - Продажа Буб
              </h2>

              {collectionArray.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="PackageOpen" size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Инвентарь пуст</p>
                  <p className="text-sm">Откройте кейсы, чтобы получить Буб для продажи!</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collectionArray.map((item) => (
                      <Card 
                        key={item.id}
                        className={`p-4 border-2 ${rarityConfig[item.rarity].borderColor} ${rarityConfig[item.rarity].bgColor}`}
                      >
                        <Badge className={`mb-2 ${rarityConfig[item.rarity].color} bg-background/80`}>
                          {rarityConfig[item.rarity].label}
                        </Badge>
                        {item.rarity === 'invisible' ? (
                          <div className="w-full h-48 flex flex-col items-center justify-center text-center mb-3">
                            <p className="text-sm font-bold text-muted-foreground mb-1">Его нету</p>
                            <p className="text-xs text-muted-foreground/80">он типа невидимый</p>
                            <Icon name="Ghost" size={40} className="text-muted-foreground/40 mt-2" />
                          </div>
                        ) : (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-48 object-contain mb-3 rounded-lg"
                          />
                        )}
                        <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                        <div className="flex items-center gap-1 mb-3 text-sm text-muted-foreground">
                          <Icon name="Hash" size={14} />
                          В наличии: {item.count} шт
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              placeholder="Цена"
                              value={sellPrice[item.id] || ''}
                              onChange={(e) => setSellPrice({ ...sellPrice, [item.id]: parseInt(e.target.value) || 0 })}
                              className="flex-1 px-3 py-2 bg-background border rounded-md text-sm"
                            />
                            <Button 
                              onClick={() => sellBooba(item.id)}
                              disabled={item.count < 1}
                              size="sm"
                            >
                              <Icon name="Tag" size={14} className="mr-1" />
                              Продать
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;