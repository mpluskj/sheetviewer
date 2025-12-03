const CACHE_NAME = 'sheet-viewer-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './navigation-styles.css',
    './app.js',
    './format-handler.js',
    './utils.js',
    './manifest.json',
    './icon.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
    // 새로운 서비스 워커가 즉시 활성화되도록 설정
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('캐시 생성 및 파일 저장');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// 서비스 워커 활성화 및 이전 캐시 정리
self.addEventListener('activate', (event) => {
    // 클라이언트 제어권 즉시 획득
    event.waitUntil(clients.claim());
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('이전 캐시 삭제:', cacheName);
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