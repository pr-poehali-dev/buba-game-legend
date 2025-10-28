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
  rarity: 'legendary' | 'rare' | 'common';
  image: string;
  chance: number;
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
    chance: 5
  },
  {
    id: 'laughing-booba',
    name: 'Смеющийся Буба',
    rarity: 'rare',
    image: 'https://cdn.poehali.dev/files/328f4730-f1e2-45c6-bc03-ca94d18b5ffd.jpg',
    chance: 15
  },
  {
    id: 'sad-booba',
    name: 'Грустный Буба',
    rarity: 'rare',
    image: 'https://cdn.poehali.dev/files/5f53971d-d15f-4de0-9a09-f5a52d8991c5.jpg',
    chance: 10
  },
  {
    id: 'regular-booba',
    name: 'Обычный Буба',
    rarity: 'common',
    image: 'https://cdn.poehali.dev/files/506d5ba0-644a-4c64-a200-0715bb43c72b.jpg',
    chance: 50
  },
  {
    id: 'sleepy-booba',
    name: 'Спящий Буба',
    rarity: 'common',
    image: 'https://cdn.poehali.dev/files/559f0072-6940-41a7-b372-f0dd81de24e5.jpg',
    chance: 25
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
  }
};

const Index = () => {
  const [isOpening, setIsOpening] = useState(false);
  const [currentBooba, setCurrentBooba] = useState<Booba | null>(null);
  const [collection, setCollection] = useState<Record<string, CollectionItem>>({});
  const [totalOpened, setTotalOpened] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedCollection = localStorage.getItem('booba-collection');
    const savedTotal = localStorage.getItem('booba-total-opened');
    
    if (savedCollection) {
      setCollection(JSON.parse(savedCollection));
    }
    if (savedTotal) {
      setTotalOpened(parseInt(savedTotal));
    }
  }, []);

  const saveProgress = (newCollection: Record<string, CollectionItem>, newTotal: number) => {
    localStorage.setItem('booba-collection', JSON.stringify(newCollection));
    localStorage.setItem('booba-total-opened', newTotal.toString());
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
    
    setIsOpening(true);
    setShowResult(false);
    setCurrentBooba(null);
    
    setTimeout(() => {
      const wonBooba = getRandomBooba();
      setCurrentBooba(wonBooba);
      
      const newCollection = { ...collection };
      const newTotal = totalOpened + 1;
      
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
      saveProgress(newCollection, newTotal);
      
      setTimeout(() => {
        setShowResult(true);
        setIsOpening(false);
        
        toast({
          title: wonBooba.rarity === 'legendary' ? '🎉 ЛЕГЕНДАРНЫЙ!' : wonBooba.rarity === 'rare' ? '✨ РЕДКИЙ!' : '✅ Получен!',
          description: `Вы получили ${wonBooba.name}!`
        });
      }, 800);
    }, 500);
  };

  const collectionArray = Object.values(collection).sort((a, b) => {
    const rarityOrder = { legendary: 0, rare: 1, common: 2 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
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
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <Icon name="Package" size={18} />
              Открыть кейсы
            </TabsTrigger>
            <TabsTrigger value="collection" className="flex items-center gap-2">
              <Icon name="Trophy" size={18} />
              Коллекция ({stats.unique}/{boobas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="space-y-8">
            <div className="text-center space-y-6">
              <Card className="max-w-md mx-auto p-8 bg-card/50 backdrop-blur border-2">
                <div className="relative">
                  {!showResult ? (
                    <div 
                      className={`w-64 h-64 mx-auto bg-gradient-to-br from-primary/30 to-legendary/30 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                        isOpening ? 'animate-case-shake' : ''
                      }`}
                      onClick={openCase}
                    >
                      <Icon name="Package" size={100} className="text-primary" />
                    </div>
                  ) : currentBooba && (
                    <div className="animate-booba-appear">
                      <div className={`relative p-4 rounded-2xl border-4 ${rarityConfig[currentBooba.rarity].borderColor} ${rarityConfig[currentBooba.rarity].bgColor}`}>
                        <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2 ${rarityConfig[currentBooba.rarity].color} bg-background border-2 ${rarityConfig[currentBooba.rarity].borderColor}`}>
                          {rarityConfig[currentBooba.rarity].label}
                        </Badge>
                        <img 
                          src={currentBooba.image} 
                          alt={currentBooba.name}
                          className="w-64 h-64 object-contain mx-auto animate-glow-pulse"
                          style={{ color: `hsl(var(--${currentBooba.rarity}))` }}
                        />
                        <h3 className="text-2xl font-bold mt-4">{currentBooba.name}</h3>
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
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-48 object-contain mb-3 rounded-lg"
                        />
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
        </Tabs>
      </div>
    </div>
  );
};

export default Index;