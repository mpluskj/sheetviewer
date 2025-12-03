const CACHE_NAME = 'sheetviewer-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './navigation-styles.css',
    './app.js',
    './format-handler.js',
    './utils.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap'
];

// 설치 이벤트: 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('캐시 열기 및 파일 저장');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// 활성화 이벤트: 오래된 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('오래된 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 요청 가로채기: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에 있으면 반환
                if (response) {
                    return response;
                }
                
                // 없으면 네트워크 요청
                return fetch(event.request).then(
                    (response) => {
                        // 유효하지 않은 응답은 그대로 반환
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 응답을 복제하여 캐시에 저장 (API 요청 제외)
                        if (!event.request.url.includes('sheets.googleapis.com')) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }

                        return response;
                    }
                );
            })
    );
});