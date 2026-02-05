import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

function App() {
  const user = WebApp.initDataUnsafe.user;

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🚇 Метро Империя</h1>
        <p>Привет, {user?.first_name || 'Игрок'}!</p>
      </header>

      <main className="main">
        <div className="card">
          <h2>🏠 Моя станция</h2>
          <p>Уровень: 1</p>
        </div>

        <div className="resources">
          <div className="resource-item">
            <span className="icon">⚡</span>
            <div>
              <div className="value">5,000</div>
              <div className="label">Энергия</div>
            </div>
          </div>

          <div className="resource-item">
            <span className="icon">🛠</span>
            <div>
              <div className="value">2,000</div>
              <div className="label">Металл</div>
            </div>
          </div>

          <div className="resource-item">
            <span className="icon">💧</span>
            <div>
              <div className="value">1,000</div>
              <div className="label">Вода</div>
            </div>
          </div>

          <div className="resource-item">
            <span className="icon">🌾</span>
            <div>
              <div className="value">500</div>
              <div className="label">Еда</div>
            </div>
          </div>
        </div>

        <div className="buttons">
          <button className="btn btn-primary">🏗 База</button>
          <button className="btn btn-primary">⚔️ Армия</button>
          <button className="btn btn-secondary">🗺 Карта</button>
          <button className="btn btn-secondary">👥 Клан</button>
        </div>
      </main>

      <footer className="footer">
        <p>Platform: {WebApp.platform}</p>
      </footer>
    </div>
  );
}

export default App;