document.addEventListener('DOMContentLoaded', () => {
    const fridgeImage = document.getElementById('fridgeImage');
    const fridgeInterior = document.getElementById('fridgeInterior');
    const fridgeItemsContainer = document.getElementById('fridgeItems');
    const foodListContainer = document.getElementById('foodList');

    // 음식별 유통기한 데이터 (단위: 일)
    const foodExpiryData = {
        "사과": 30,
        "우유": 7,
        "계란": 21,
        "요거트": 14,
        "치즈": 60,
        "햄": 5,
        "양파": 90,
        "토마토": 10,
        "바나나": 7,
        "브로콜리": 5,
        "닭가슴살": 3,
        "소고기": 4,
        "생선": 2
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

    // 음식 목록 렌더링
    function renderFoodSelection() {
        foodListContainer.innerHTML = ''; // 기존 목록 비우기
        for (const foodName in foodExpiryData) {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('food-item-select');
            foodItemDiv.textContent = foodName;
            foodItemDiv.dataset.food = foodName;
            foodListContainer.appendChild(foodItemDiv);
        }
    }

    // 음식 아이템을 냉장고에 추가
    function addFoodToFridge(foodName) {
        const today = new Date();
        const expiryDays = foodExpiryData[foodName];
        if (expiryDays === undefined) {
            console.error(`Unknown food item: ${foodName}`);
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
                expiryInfo = `만료됨 (${Math.abs(daysLeft)}일 지남)`;
                foodItemDiv.classList.add('expired');
            } else if (daysLeft === 0) {
                expiryInfo = '오늘 만료';
                foodItemDiv.classList.add('expiring-soon');
            } else if (daysLeft <= 7) {
                expiryInfo = `${daysLeft}일 남음`;
                foodItemDiv.classList.add('expiring-soon');
            } else {
                expiryInfo = `${item.expiry} (${daysLeft}일 남음)`;
            }

            foodItemDiv.innerHTML = `
                <span>${item.name}</span>
                <span class="expiry-info">${expiryInfo}</span>
                <button class="delete-btn" aria-label="Delete item">X</button>
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

    // 이벤트 리스너: 음식 선택 클릭 시 냉장고에 추가
    foodListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('food-item-select')) {
            const foodName = e.target.dataset.food;
            addFoodToFridge(foodName);
        }
    });

    // 초기 렌더링
    renderFoodSelection(); // 추가 가능한 음식 목록 렌더링
    renderFridgeContents(); // 냉장고 내부 내용 렌더링
});