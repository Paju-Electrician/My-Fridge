document.addEventListener('DOMContentLoaded', () => {
    const itemNameInput = document.getElementById('itemName');
    const expiryDateInput = document.getElementById('expiryDate');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemList = document.getElementById('itemList');
    const filterOption = document.getElementById('filterOption');
    const sortOption = document.getElementById('sortOption');

    let items = loadItems(); // 로컬 스토리지에서 아이템 로드

    // 로컬 스토리지에서 아이템 불러오기
    function loadItems() {
        const storedItems = localStorage.getItem('fridgeItems');
        return storedItems ? JSON.parse(storedItems) : [];
    }

    // 아이템 로컬 스토리지에 저장하기
    function saveItems() {
        localStorage.setItem('fridgeItems', JSON.stringify(items));
    }

    // 아이템 추가 함수
    function addItem() {
        const name = itemNameInput.value.trim();
        const expiry = expiryDateInput.value;

        if (name === '' || expiry === '') {
            alert('음식 이름과 유통기한을 모두 입력해주세요.');
            return;
        }

        const newItem = {
            id: Date.now(), // 고유 ID
            name: name,
            expiry: expiry, // YYYY-MM-DD 형식
            addedDate: new Date().toISOString().split('T')[0] // 추가된 날짜
        };

        items.push(newItem);
        saveItems();
        renderItems(); // 아이템 목록 다시 렌더링

        // 입력 필드 초기화
        itemNameInput.value = '';
        expiryDateInput.value = '';
    }

    // 아이템 삭제 함수
    function deleteItem(id) {
        items = items.filter(item => item.id !== id);
        saveItems();
        renderItems();
    }

    // 아이템 목록 렌더링 함수
    function renderItems() {
        itemList.innerHTML = ''; // 기존 목록 비우기

        let displayItems = [...items]; // 원본 배열 복사

        // 필터링 로직
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작 시간으로 설정

        const filterValue = filterOption.value;
        displayItems = displayItems.filter(item => {
            const expiryDate = new Date(item.expiry);
            expiryDate.setHours(0, 0, 0, 0); // 유통기한 날짜의 시작 시간으로 설정
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (filterValue === 'all') return true;
            if (filterValue === 'today') return daysLeft === 0;
            if (filterValue === 'soon') return daysLeft > 0 && daysLeft <= 7;
            if (filterValue === 'expired') return daysLeft < 0;
            return true;
        });

        // 정렬 로직
        const sortValue = sortOption.value;
        displayItems.sort((a, b) => {
            if (sortValue === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortValue === 'expiryAsc') {
                return new Date(a.expiry) - new Date(b.expiry);
            } else if (sortValue === 'expiryDesc') {
                return new Date(b.expiry) - new Date(a.expiry);
            }
            return 0;
        });

        displayItems.forEach(item => {
            const li = document.createElement('li');
            const expiryDate = new Date(item.expiry);
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            let expiryInfo = '';
            if (daysLeft < 0) {
                expiryInfo = `만료됨 (${Math.abs(daysLeft)}일 지남)`;
                li.classList.add('expired');
            } else if (daysLeft === 0) {
                expiryInfo = '오늘 만료';
                li.classList.add('expiring-soon');
            } else if (daysLeft <= 7) {
                expiryInfo = `${daysLeft}일 남음`;
                li.classList.add('expiring-soon');
            } else {
                expiryInfo = `${item.expiry} (${daysLeft}일 남음)`;
            }

            li.innerHTML = `
                <span>${item.name}</span>
                <span class="expiry-info">${expiryInfo}</span>
                <button class="delete-btn" data-id="${item.id}">삭제</button>
            `;
            itemList.appendChild(li);
        });

        // 삭제 버튼 이벤트 리스너 추가 (렌더링 후)
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                deleteItem(id);
            });
        });
    }

    // 이벤트 리스너
    addItemBtn.addEventListener('click', addItem);
    filterOption.addEventListener('change', renderItems); // 필터 변경 시 재렌더링
    sortOption.addEventListener('change', renderItems);   // 정렬 변경 시 재렌더링

    // 초기 렌더링
    renderItems();
});