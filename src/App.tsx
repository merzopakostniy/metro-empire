import { useEffect, useMemo, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

const DAILY_CRYSTALS = [1, 2, 3, 4, 5, 6, 7] as const;

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const clampDay = (value: number) => Math.min(7, Math.max(1, value));

function App() {
  const user = WebApp.initDataUnsafe.user;
  const [resources, setResources] = useState({
    energy: 5000,
    metal: 2000,
    water: 1000,
    food: 500,
    crystals: 100,
  });
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = getDateKey();
    const yesterday = getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastClaim = localStorage.getItem('metro_daily_claim_date');
    const storedStreak = Number(localStorage.getItem('metro_daily_streak') || 0);

    if (lastClaim === today) {
      setDailyClaimed(true);
      setDailyStreak(storedStreak || 1);
    } else if (lastClaim === yesterday) {
      setDailyClaimed(false);
      setDailyStreak(storedStreak || 0);
    } else {
      setDailyClaimed(false);
      setDailyStreak(0);
    }
  }, []);

  const nextStreak = useMemo(() => {
    if (dailyClaimed) return dailyStreak;
    if (dailyStreak >= 7) return 7;
    return dailyStreak > 0 ? dailyStreak + 1 : 1;
  }, [dailyClaimed, dailyStreak]);

  const displayStreak = dailyClaimed ? dailyStreak : nextStreak;
  const todayReward = DAILY_CRYSTALS[clampDay(displayStreak) - 1] ?? 1;

  const formatNumber = (value: number) => value.toLocaleString('ru-RU');

  const handleDailyClaim = (dayNumber: number) => {
    if (dailyClaimed) return;
    if (dayNumber !== displayStreak) return;
    const today = getDateKey();
    const yesterday = getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastClaim = localStorage.getItem('metro_daily_claim_date');
    const storedStreak = Number(localStorage.getItem('metro_daily_streak') || 0);
    const newStreak = lastClaim === yesterday ? Math.min(7, storedStreak + 1) : 1;
    const rewardCrystals = DAILY_CRYSTALS[clampDay(newStreak) - 1] ?? 1;

    setDailyClaimed(true);
    setDailyStreak(newStreak);
    setResources((prev) => ({
      ...prev,
      crystals: prev.crystals + rewardCrystals,
    }));

    localStorage.setItem('metro_daily_claim_date', today);
    localStorage.setItem('metro_daily_streak', String(newStreak));
  };

  return (
    <div className="app">
      {/* Top Resource Bar */}
      <div className="resource-bar">
        <div className="resource">
          <div className="resource-icon energy">⚡</div>
          <div className="resource-info">
            <div className="resource-value">{formatNumber(resources.energy)}</div>
            <div className="resource-progress">
              <div className="resource-fill" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
        <div className="resource">
          <div className="resource-icon metal">🛠</div>
          <div className="resource-info">
            <div className="resource-value">{formatNumber(resources.metal)}</div>
            <div className="resource-progress">
              <div className="resource-fill" style={{ width: '40%' }}></div>
            </div>
          </div>
        </div>
        <div className="resource">
          <div className="resource-icon water">💧</div>
          <div className="resource-info">
            <div className="resource-value">{formatNumber(resources.water)}</div>
            <div className="resource-progress">
              <div className="resource-fill" style={{ width: '20%' }}></div>
            </div>
          </div>
        </div>
        <div className="resource">
          <div className="resource-icon food">🌾</div>
          <div className="resource-info">
            <div className="resource-value">{formatNumber(resources.food)}</div>
            <div className="resource-progress">
              <div className="resource-fill" style={{ width: '10%' }}></div>
            </div>
          </div>
        </div>
        <div className="resource">
          <div className="resource-icon crystal">💎</div>
          <div className="resource-info">
            <div className="resource-value">{formatNumber(resources.crystals)}</div>
            <div className="resource-progress">
              <div className="resource-fill crystal-fill" style={{ width: '55%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Profile Header */}
      <header className="header">
        <div className="player-info">
          <div className="avatar">
            <span className="avatar-icon">👤</span>
            <div className="level-badge">1</div>
          </div>
          <div className="player-details">
            <div className="player-name">{user?.first_name || 'Командир'}</div>
            <div className="player-title">Начальник станции</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn settings">⚙️</button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="main">
        {/* Station Card */}
        <div className="station-card">
          <div className="station-glow"></div>
          <div className="station-content">
            <div className="station-icon">🚇</div>
            <div className="station-info">
              <h1 className="station-name">Метро Империя</h1>
              <div className="station-level">
                <span className="level-label">Уровень станции</span>
                <span className="level-value">1</span>
              </div>
              <div className="station-exp">
                <div className="exp-bar">
                  <div className="exp-fill" style={{ width: '35%' }}></div>
                </div>
                <span className="exp-text">350 / 1000 XP</span>
              </div>
            </div>
          </div>
          <button className="upgrade-btn">
            <span className="upgrade-icon">⬆️</span>
            <span>Улучшить</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="action-card" onClick={() => setIsDailyOpen(true)}>
            <div className="action-icon">📦</div>
            <div className="action-label">Награды</div>
            {!dailyClaimed ? (
              <div className="action-badge pulse">!</div>
            ) : (
              <div className="action-badge success">✓</div>
            )}
          </div>
          <div className="action-card">
            <div className="action-icon">📋</div>
            <div className="action-label">Задания</div>
            <div className="action-badge">5</div>
          </div>
          <div className="action-card">
            <div className="action-icon">🎁</div>
            <div className="action-label">Ежедневно</div>
            <div className="action-badge pulse">!</div>
          </div>
        </div>

        {/* Event Banner */}
        <div className="event-banner">
          <div className="event-icon">🎪</div>
          <div className="event-info">
            <div className="event-title">Зимнее событие!</div>
            <div className="event-desc">Собирай снежинки и получай награды</div>
          </div>
          <div className="event-timer">02:45:30</div>
        </div>

        {/* Project Content Guide */}
        <section className="content-area">
          <div className="content-header">
            <div className="content-title">Полный контент проекта</div>
            <div className="content-subtitle">
              Сценарий, экономика, PvP, кланы, меню и ассеты
            </div>
          </div>

          <div className="content-grid">
            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">📜</div>
                <div>
                  <div className="content-card-title">Сценарий и политика</div>
                  <div className="content-card-desc">Идеология метро и правила дизайна</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Идеология: порядок линий, власть энергии, узлы метро.</li>
                <li>Акт I: Возрождение линии и запуск базовых мощностей.</li>
                <li>Акт II: Война за узлы и контроль туннелей.</li>
                <li>Акт III: Экспедиция на поверхность и артефакты.</li>
                <li>Политика: честный F2P и прозрачные формулы.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">📊</div>
                <div>
                  <div className="content-card-title">Экономика и ресурсы</div>
                  <div className="content-card-desc">Источники, стоки и баланс</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Ресурсы: энергия, металл, вода, еда, кристаллы.</li>
                <li>Источники: здания, рейды, караваны, события.</li>
                <li>Стоки: строительство, исследования, армия, лечение.</li>
                <li>Контроль инфляции: лимиты складов и налоги.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">⛏</div>
                <div>
                  <div className="content-card-title">Добыча ресурсов</div>
                  <div className="content-card-desc">Пассивная и активная добыча</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Генераторы, шахты, скважины, фермы.</li>
                <li>Энергия лимитирует производство и рост.</li>
                <li>Ресурсные точки на карте с риском PvP.</li>
                <li>Автосбор + ручной сбор с бонусом.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">⚔️</div>
                <div>
                  <div className="content-card-title">Боевая мощь</div>
                  <div className="content-card-desc">Состав армии и мультипликаторы</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Юниты: пехота, техника, элита.</li>
                <li>Герои и снаряжение усиливают отряды.</li>
                <li>Доктрины исследований дают глобальные бонусы.</li>
                <li>Формула силы отображается в армии.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">🛡</div>
                <div>
                  <div className="content-card-title">PvP и нападения</div>
                  <div className="content-card-desc">Рейды, разведка, защита</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Разведка через Радар и скрытые данные.</li>
                <li>Лимит грабежа: до 20% ресурсов цели.</li>
                <li>Щиты новичка и временная защита.</li>
                <li>Реванш и рейтинг с очками славы.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">👥</div>
                <div>
                  <div className="content-card-title">Кланы</div>
                  <div className="content-card-desc">Социальные и боевые механики</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Ранги, права, клановый склад и магазин.</li>
                <li>Клановые технологии усиливают всех.</li>
                <li>Войны 24/48 часов, по 2 атаки.</li>
                <li>Контроль узлов даёт бонусы линии.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">🎒</div>
                <div>
                  <div className="content-card-title">Старт и туториал</div>
                  <div className="content-card-desc">Первый вход в Telegram</div>
                </div>
              </div>
              <ul className="content-list">
                <li>/start → «Открыть игру» → выбор линии.</li>
                <li>Стартовый набор: ресурсы, 10 ополченцев, герой.</li>
                <li>Шаги: скважина → ферма → генератор.</li>
                <li>Первый рейд на мутантов и награды.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">🧭</div>
                <div>
                  <div className="content-card-title">Меню и экраны</div>
                  <div className="content-card-desc">Навигация и ключевые действия</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Верх: ресурсы, магазин, почта, настройки.</li>
                <li>Низ: база, армия, главная, карта, клан.</li>
                <li>Экраны: профиль, магазин, рейтинги, карта.</li>
                <li>Очереди строительства и исследований.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">🎨</div>
                <div>
                  <div className="content-card-title">Ассеты и иконки</div>
                  <div className="content-card-desc">Полный список графики и звука</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Иконки 32/64, здания 128/256, герои 512.</li>
                <li>Фоны: станция, туннели, карта линий.</li>
                <li>VFX/SFX: искры, поезда, UI-клики.</li>
                <li>UI элементы: кнопки, панели, прогресс.</li>
              </ul>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <div className="content-icon">📣</div>
                <div>
                  <div className="content-card-title">Telegram функции</div>
                  <div className="content-card-desc">Встроенные возможности платформы</div>
                </div>
              </div>
              <ul className="content-list">
                <li>Глубокие ссылки, быстрые команды и уведомления.</li>
                <li>Платежи Telegram и витрина предложений.</li>
                <li>Клановый чат и объявления через бота.</li>
                <li>Системные сообщения и награды в почте.</li>
              </ul>
            </div>
          </div>

          <div className="content-footer">
            <div className="content-footer-icon">📘</div>
          <div className="content-footer-text">
            Полная версия находится в документе проекта: GAME_DESIGN_DOCUMENT.md
          </div>
        </div>
        </section>
      </main>

      {/* Daily Rewards Modal */}
      {isDailyOpen && (
        <div className="modal-overlay" onClick={() => setIsDailyOpen(false)}>
          <div className="daily-modal" onClick={(event) => event.stopPropagation()}>
            <div className="daily-header">
              <div>
                <div className="daily-title">Кристаллы за вход</div>
                <div className="daily-subtitle">
                  {dailyClaimed ? 'Награда за сегодня получена' : `Сегодня: +${todayReward} 💎`}
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsDailyOpen(false)}>
                ✕
              </button>
            </div>

            <div className="daily-card-grid">
              {DAILY_CRYSTALS.map((amount, index) => {
                const dayNumber = index + 1;
                const isClaimed = dailyClaimed
                  ? dayNumber <= dailyStreak
                  : dayNumber < displayStreak;
                const isToday = !dailyClaimed && dayNumber === displayStreak;
                const status = isClaimed ? 'Получено' : isToday ? 'Собрать' : 'Ожидание';
                return (
                  <button
                    key={`day-${dayNumber}`}
                    className={`daily-card${isClaimed ? ' claimed' : ''}${
                      isToday ? ' today' : ''
                    }`}
                    onClick={() => handleDailyClaim(dayNumber)}
                    disabled={!isToday || dailyClaimed}
                  >
                    <div className="daily-card-day">День {dayNumber}</div>
                    <div className="daily-card-amount">{amount} 💎</div>
                    <div className="daily-card-status">{status}</div>
                  </button>
                );
              })}
            </div>
            <div className="daily-note">
              Серия посещений: {displayStreak}/7. Нажми на карточку текущего дня,
              чтобы собрать. Пропуск дня сбрасывает серию.
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-item">
          <div className="nav-icon">🏗</div>
          <div className="nav-label">База</div>
        </button>
        <button className="nav-item">
          <div className="nav-icon">⚔️</div>
          <div className="nav-label">Армия</div>
        </button>
        <button className="nav-item active">
          <div className="nav-icon">🏠</div>
          <div className="nav-label">Главная</div>
        </button>
        <button className="nav-item">
          <div className="nav-icon">🗺</div>
          <div className="nav-label">Карта</div>
        </button>
        <button className="nav-item">
          <div className="nav-icon">👥</div>
          <div className="nav-label">Клан</div>
        </button>
      </nav>
    </div>
  );
}

export default App;
