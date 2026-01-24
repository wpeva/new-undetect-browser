# Запуск антидетект браузера

## 1 команда:

```bash
./start.sh
```

Готово! Сервер запущен на http://localhost:3000

## API:

```bash
# Проверка работы
curl http://localhost:3000/api/v2/health

# Список профилей
curl http://localhost:3000/api/v2/profiles

# Создать профиль
curl -X POST http://localhost:3000/api/v2/profiles \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Profile"}'

# Запустить браузер
curl -X POST http://localhost:3000/api/v2/profiles/PROFILE_ID/launch
```

## Пример (Node.js):

```javascript
const axios = require('axios');

async function startBrowser() {
  const { data } = await axios.post('http://localhost:3000/api/v2/profiles', {
    name: 'My Browser'
  });
  
  await axios.post(`http://localhost:3000/api/v2/profiles/${data.id}/launch`);
  console.log('Браузер запущен!');
}

startBrowser();
```

## Остановка:

Нажмите `Ctrl+C`
