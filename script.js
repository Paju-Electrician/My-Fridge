document.addEventListener('DOMContentLoaded', () => {
    const fridgeImage = document.getElementById('fridgeImage');
    const fridgeInterior = document.getElementById('fridgeInterior');
    const fridgeItemsContainer = document.getElementById('fridgeItems');
    const foodListContainer = document.getElementById('foodList');
    const clearAllItemsBtn = document.getElementById('clearAllItemsBtn');
    const langSelect = document.getElementById('langSelect'); // 언어 선택 드롭다운 참조

    // 언어별 텍스트 데이터
    const translations = {
        ko: {
            appName: "나의 똑똑한 냉장고",
            fridgeInteriorTitle: "냉장고 내부",
            clearAll: "모두 삭제",
            addFoodSection: "음식 추가",
            expirySoon: "일 남음",
            expiryToday: "오늘 만료",
            expiryTomorrow: "내일 만료",
            expired: "만료됨",
            daysAgo: "일 지남",
            confirmClear: "냉장고 안의 모든 음식을 삭제하시겠습니까?",
            alertAllFields: "음식 이름과 유통기한을 모두 입력해주세요.", // 이 메시지는 현재 사용 안됨
            language: "언어:",
            unknownFood: "알 수 없는 음식"
        },
        en: {
            appName: "My Smart Fridge",
            fridgeInteriorTitle: "Fridge Interior",
            clearAll: "Clear All",
            addFoodSection: "Add Food",
            expirySoon: "days left",
            expiryToday: "Expires today",
            expiryTomorrow: "Expires tomorrow",
            expired: "Expired",
            daysAgo: "days ago",
            confirmClear: "Are you sure you want to delete all items from the fridge?",
            alertAllFields: "Please enter both food name and expiry date.", // 이 메시지는 현재 사용 안됨
            language: "Language:",
            unknownFood: "Unknown Food"
        }
    };

    // 현재 언어 설정 로드 (기본값: 한국어)
    let currentLang = localStorage.getItem('appLang') || 'ko';
    langSelect.value = currentLang;

    // UI 텍스트 업데이트 함수
    function updateTexts() {
        const lang = currentLang;
        document.querySelector('h1').textContent = translations[lang].appName;
        document.querySelector('.fridge-interior h2').textContent = translations[lang].fridgeInteriorTitle;
        document.getElementById('clearAllItemsBtn').textContent = translations[lang].clearAll;
        document.querySelector('.food-selection h2').textContent = translations[lang].addFoodSection;
        document.querySelector('.language-selector label').textContent = translations[lang].language;

        // 음식 목록은 언어에 영향을 받지 않으므로 renderFoodSelection은 그대로
        renderFridgeContents(); // 냉장고 내부 내용 다시 렌더링 (유통기한 정보에 언어 영향)
    }

    // 음식별 유통기한 데이터 (단위: 일)
    const foodExpiryData = {
        "감자": 30, "고등어": 3, "김치": 180, "닭고기": 3, "달걀": 21, "딸기": 5, "두부": 7, "마늘": 60, "바나나": 7,
        "배추": 10, "버섯": 7, "브로콜리": 5, "사과": 30, "상추": 7, "새우": 2, "소고기": 4, "시금치": 7, "양파": 90,
        "오렌지": 20, "우유": 7, "요거트": 14, "자몽": 14, "치즈": 60, "콩나물": 3, "토마토": 10, "파": 7, "포도": 7,
        "피망": 10, "햄": 5
    };

    let fridgeContents = loadFridgeContents(); // 로컬 스토리지에서 냉장고 내용 로드

    // 로컬 스토리지에서 냉장고 내용 불러오기
    function loadFridgeContents() {
        const storedContents = localStorage.getItem('myFridgeContents');
        return storedContents ? JSON.parse(storedContents) : [];
    }

    // 냉장고 내용 로컬 스토리지에 저장하기
    function saveFridgeContents() {
        localStorage.setItem('myFridgeContents', JSON.stringify(fridgeContents));
    }

    // 냉장고 열기/닫기 토글
    fridgeImage.addEventListener('click', () => {
        fridgeInterior.classList.toggle('open');
    });

    // 음식 목록 렌더링 (가나다순 정렬)
    function renderFoodSelection() {
        foodListContainer.innerHTML = ''; // 기존 목록 비우기
        const sortedFoodNames = Object.keys(foodExpiryData).sort((a, b) => a.localeCompare(b, 'ko-KR')); // 가나다순 정렬

        sortedFoodNames.forEach(foodName => {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('food-item-select');
            foodItemDiv.textContent = foodName;
            foodItemDiv.dataset.food = foodName;
            foodListContainer.appendChild(foodItemDiv);
        });
    }

    // 음식 아이템을 냉장고에 추가
    function addFoodToFridge(foodName) {
        const today = new Date();
        const expiryDays = foodExpiryData[foodName];
        if (expiryDays === undefined) {
            console.error(`${translations[currentLang].unknownFood}: ${foodName}`); // 텍스트 변경
            return;
        }

        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + expiryDays);

        const newItem = {
            id: Date.now(),
            name: foodName,
            expiry: expiryDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
            addedDate: today.toISOString().split('T')[0]
        };

        fridgeContents.push(newItem);
        saveFridgeContents();
        renderFridgeContents(); // 냉장고 내용 다시 렌더링
    }

    // 냉장고 내부 음식 아이템 렌더링
    function renderFridgeContents() {
        fridgeItemsContainer.innerHTML = ''; // 기존 목록 비우기

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        fridgeContents.forEach(item => {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('fridge-item');
            foodItemDiv.dataset.id = item.id;

            const expiryDate = new Date(item.expiry);
            expiryDate.setHours(0, 0, 0, 0);
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            let expiryInfo = '';
            if (daysLeft < 0) {
                expiryInfo = `${translations[currentLang].expired} (${Math.abs(daysLeft)}${translations[currentLang].daysAgo})`;
                foodItemDiv.classList.add('expired');
            } else if (daysLeft === 0) {
                expiryInfo = translations[currentLang].expiryToday;
                foodItemDiv.classList.add('expiring-soon-red');
            } else if (daysLeft === 1) {
                expiryInfo = translations[currentLang].expiryTomorrow;
                foodItemDiv.classList.add('expiring-soon-red');
            } else if (daysLeft > 1 && daysLeft <= 3) {
                expiryInfo = `${daysLeft}${translations[currentLang].expirySoon}`;
                foodItemDiv.classList.add('expiring-soon-yellow');
            } else if (daysLeft > 3 && daysLeft <= 7) {
                expiryInfo = `${daysLeft}${translations[currentLang].expirySoon}`;
                foodItemDiv.classList.add('expiring-soon');
            } else {
                expiryInfo = `${item.expiry} (${daysLeft}${translations[currentLang].expirySoon})`;
            }

            foodItemDiv.innerHTML = `
                <span>${item.name}</span>
                <span class="expiry-info">${expiryInfo}</span>
                <button class="delete-btn" aria-label="${translations[currentLang].clearAll}">X</button>
            `;
            fridgeItemsContainer.appendChild(foodItemDiv);
        });

        // 삭제 버튼 이벤트 리스너 추가
        document.querySelectorAll('.fridge-item .delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.closest('.fridge-item').dataset.id);
                deleteFoodFromFridge(id);
            });
        });
    }

    // 냉장고에서 음식 삭제
    function deleteFoodFromFridge(id) {
        const itemToRemove = document.querySelector(`.fridge-item[data-id="${id}"]`);
        if (itemToRemove) {
            itemToRemove.classList.add('removing'); // 사라짐 애니메이션 클래스 추가
            itemToRemove.addEventListener('animationend', () => {
                fridgeContents = fridgeContents.filter(item => item.id !== id);
                saveFridgeContents();
                renderFridgeContents(); // 애니메이션 완료 후 냉장고 내용 다시 렌더링
            }, { once: true }); // 이벤트 리스너 한 번만 실행
        }
    }

    // 전체 아이템 삭제 함수
    function clearAllItems() {
        if (confirm(translations[currentLang].confirmClear)) {
            fridgeContents = []; // 배열 비우기
            saveFridgeContents();
            renderFridgeContents();
        }
    }

    // 이벤트 리스너: 음식 선택 클릭 시 냉장고에 추가
    foodListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('food-item-select')) {
            const foodName = e.target.dataset.food;
            addFoodToFridge(foodName);
        }
    });

    clearAllItemsBtn.addEventListener('click', clearAllItems);

    // 언어 선택 이벤트 리스너
    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('appLang', currentLang);
        updateTexts(); // 언어 변경 시 UI 텍스트 업데이트
    });

    // 초기 렌더링 및 텍스트 업데이트
    renderFoodSelection(); // 추가 가능한 음식 목록 렌더링
    // renderFridgeContents(); // updateTexts에서 호출되므로 주석 처리
    updateTexts(); // 초기 로드 시 텍스트 업데이트
});
