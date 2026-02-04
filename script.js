document.addEventListener('DOMContentLoaded', () => {
    const fridgeImage = document.getElementById('fridgeImage');
    const fridgeInterior = document.getElementById('fridgeInterior');
    const fridgeItemsContainer = document.getElementById('fridgeItems');
    const foodCategoriesContainer = document.getElementById('foodCategories'); // 카테고리 컨테이너 참조
    const foodItemsByCategoryContainer = document.getElementById('foodItemsByCategory'); // 카테고리별 음식 아이템 컨테이너 참조
    const foodSelection = document.querySelector('.food-selection'); // 음식 선택 섹션 참조 추가
    const clearAllItemsBtn = document.getElementById('clearAllItemsBtn');
    const langSelect = document.getElementById('langSelect'); // 언어 선택 드롭다운 참조

    // Modal elements
    const foodSelectionModal = document.getElementById('foodSelectionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalCategoryTitle = document.getElementById('modalCategoryTitle');
    const modalFoodItems = document.getElementById('modalFoodItems');
    const addSelectedFoodsBtn = document.getElementById('addSelectedFoodsBtn');

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

    // 냉장고 이미지/내부/음식 선택 섹션 가시성 업데이트 함수
    function updateFridgeView() {
        if (fridgeContents.length > 0) {
            fridgeImage.style.display = 'none'; // 냉장고 이미지 숨기기
            fridgeInterior.classList.add('open'); // 냉장고 내부 보이기 (애니메이션 포함)
            langSelect.parentElement.style.display = 'flex'; // 언어 선택기 보이기
        } else {
            fridgeImage.style.display = 'block'; // 냉장고 이미지 보이기
            fridgeInterior.classList.remove('open'); // 냉장고 내부 숨기기
            langSelect.parentElement.style.display = 'none'; // 언어 선택기 숨기기
        }
    }

    let currentModalCategory = ''; // 현재 모달에서 선택된 카테고리를 추적

    // 음식 선택 모달 열기
    function openFoodSelectionModal(categoryName) {
        currentModalCategory = categoryName; // 현재 카테고리 저장
        modalCategoryTitle.textContent = `${categoryName} 선택`;
        modalFoodItems.innerHTML = ''; // 기존 아이템 비우기

        const foodItems = foodCategoriesData[categoryName];
        if (!foodItems) return;

        const sortedFoodItems = Object.keys(foodItems).sort((a, b) => a.localeCompare(b, 'ko-KR'));

        sortedFoodItems.forEach(foodName => {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('food-item-select');
            foodItemDiv.textContent = foodName;
            foodItemDiv.dataset.food = foodName;
            foodItemDiv.dataset.category = categoryName; // 카테고리 정보도 저장
            modalFoodItems.appendChild(foodItemDiv);
        });

        foodSelectionModal.style.display = 'flex'; // 모달 보이기
    }

    // 음식 선택 모달 닫기
    function closeFoodSelectionModal() {
        foodSelectionModal.style.display = 'none'; // 모달 숨기기
        modalFoodItems.innerHTML = ''; // 모달 아이템 비우기
        currentModalCategory = ''; // 선택된 카테고리 초기화
    }

    // 카테고리별 음식 데이터 (단위: 일)
    const foodCategoriesData = {
        "육류": {
            "닭고기": 3, "소고기": 4, "돼지고기": 5, "오리고기": 6, "양고기": 4, "베이컨": 7, "소시지": 14, "햄": 5
        },
        "채소류": {
            "감자": 30, "배추": 10, "버섯": 7, "브로콜리": 5, "상추": 7, "시금치": 7, "양파": 90, "토마토": 10,
            "파": 7, "피망": 10, "콩나물": 3, "오이": 7, "당근": 21, "가지": 7, "호박": 14, "고구마": 30, "무": 14
        },
        "과일류": {
            "딸기": 5, "바나나": 7, "사과": 30, "오렌지": 20, "자몽": 14, "포도": 7, "수박": 7, "멜론": 7,
            "복숭아": 5, "체리": 5, "블루베리": 7, "키위": 14
        },
        "유제품": {
            "우유": 7, "요거트": 14, "치즈": 60, "버터": 30, "생크림": 7
        },
        "해산물": {
            "고등어": 3, "새우": 2, "오징어": 3, "명태": 4, "갈치": 3, "조개": 2, "굴": 5
        },
        "곡물/견과류": {
            "쌀": 365, "보리": 365, "아몬드": 180, "호두": 180, "땅콩": 180, "빵": 5, "라면": 180
        },
        "반찬류": {
            "김치": 180, "단무지": 30, "장아찌": 365, "어묵": 7, "맛살": 7
        },
        "기타": {
            "달걀": 21, "두부": 7, "마늘": 60, "소스": 90, "잼": 60, "꿀": 365, "초콜릿": 180, "케첩": 365
        }
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



    // 음식 카테고리 렌더링
    function renderFoodCategories() {
        foodCategoriesContainer.innerHTML = ''; // 기존 목록 비우기
        const sortedCategories = Object.keys(foodCategoriesData).sort((a, b) => a.localeCompare(b, 'ko-KR'));

        sortedCategories.forEach(categoryName => {
            const categoryDiv = document.createElement('div');
            categoryDiv.classList.add('food-category-select'); // New class for categories
            categoryDiv.textContent = categoryName;
            categoryDiv.dataset.category = categoryName;
            foodCategoriesContainer.appendChild(categoryDiv);
        });

        // 카테고리 선택 이벤트 리스너
        foodCategoriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('food-category-select')) {
                // 이전에 선택된 카테고리 스타일 제거
                document.querySelectorAll('.food-category-select').forEach(div => {
                    div.classList.remove('selected');
                });
                // 새로 선택된 카테고리 스타일 적용
                e.target.classList.add('selected');

                const selectedCategory = e.target.dataset.category;
                openFoodSelectionModal(selectedCategory); // 모달 열기
            }
        });

        // 페이지 로드 시 첫 번째 카테고리를 기본으로 선택하여 렌더링
        if (sortedCategories.length > 0) {
            foodCategoriesContainer.querySelector(`[data-category="${sortedCategories[0]}"]`).classList.add('selected');
            renderFoodItemsForCategory(sortedCategories[0]);
        }
    }

    // 선택된 카테고리에 해당하는 음식 아이템 렌더링
    function renderFoodItemsForCategory(categoryName) {
        foodItemsByCategoryContainer.innerHTML = ''; // 기존 목록 비우기
        const foodItems = foodCategoriesData[categoryName];
        if (!foodItems) return;

        const sortedFoodItems = Object.keys(foodItems).sort((a, b) => a.localeCompare(b, 'ko-KR'));

        sortedFoodItems.forEach(foodName => {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('food-item-select'); // Use existing class for styling
            foodItemDiv.textContent = foodName;
            foodItemDiv.dataset.category = categoryName; // Store category for adding
            foodItemDiv.dataset.food = foodName;
            foodItemsByCategoryContainer.appendChild(foodItemDiv);
        });
    }

    // 음식 아이템을 냉장고에 추가
    function addFoodToFridge(categoryName, foodName) {
        const today = new Date();
        const expiryDays = foodCategoriesData[categoryName][foodName];
        if (expiryDays === undefined) {
            console.error(`${translations[currentLang].unknownFood}: ${foodName} in category ${categoryName}`);
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
        updateFridgeView(); // 음식 추가 후 뷰 업데이트
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
            updateFridgeView(); // 모든 아이템 삭제 후 뷰 업데이트
        }
    }

    // 이벤트 리스너: 음식 선택 클릭 시 냉장고에 추가
    foodItemsByCategoryContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('food-item-select')) {
            const foodName = e.target.dataset.food;
            const categoryName = e.target.dataset.category;
            addFoodToFridge(categoryName, foodName);
        }
    });

    // 이벤트 리스너: 모달 내 음식 아이템 선택 (다중 선택)
    modalFoodItems.addEventListener('click', (e) => {
        if (e.target.classList.contains('food-item-select')) {
            e.target.classList.toggle('selected-modal-item');
        }
    });

    // 이벤트 리스너: 선택된 음식 냉장고에 추가 버튼
    addSelectedFoodsBtn.addEventListener('click', () => {
        const selectedItems = modalFoodItems.querySelectorAll('.food-item-select.selected-modal-item');
        selectedItems.forEach(item => {
            const foodName = item.dataset.food;
            const categoryName = item.dataset.category;
            addFoodToFridge(categoryName, foodName);
        });
        closeFoodSelectionModal(); // 모든 선택된 음식 추가 후 모달 닫기
    });

    clearAllItemsBtn.addEventListener('click', clearAllItems);

    // 언어 선택 이벤트 리스너
    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('appLang', currentLang);
        updateTexts(); // 언어 변경 시 UI 텍스트 업데이트
    });

    // 초기 렌더링 및 텍스트 업데이트
    renderFoodCategories(); // 추가 가능한 음식 카테고리 렌더링
    // renderFridgeContents(); // updateTexts에서 호출되므로 주석 처리
    updateTexts(); // 초기 로드 시 텍스트 업데이트
    updateFridgeView(); // 냉장고 뷰 업데이트

    // 모달 닫기 버튼 이벤트 리스너
    closeModalBtn.addEventListener('click', closeFoodSelectionModal);

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target === foodSelectionModal) {
            closeFoodSelectionModal();
        }
    });

    // Escape 키 눌렀을 때 닫기
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && foodSelectionModal.style.display === 'flex') {
            closeFoodSelectionModal();
        }
    });
});
