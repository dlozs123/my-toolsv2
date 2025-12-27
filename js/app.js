const app = {
  data: {
    characters: [],
    distribution: {},
    items: [],
    weather: {},
    maps: [],
    bosses: []
  },

  // 初始化
  init: async function() {
    try {
      // 并行加载所有数据
      const [
        charsRes, distRes, itemsRes, weatherRes, mapsRes, bossesRes
      ] = await Promise.all([
        fetch('./data/characters.json'),
        fetch('./data/distribution.json'),
        fetch('./data/items.json'),
        fetch('./data/weather.json'),
        fetch('./data/maps.json'),
        fetch('./data/bosses.json')
      ]);

      this.data.characters = await charsRes.json();
      this.data.distribution = await distRes.json();
      this.data.items = await itemsRes.json();
      this.data.weather = await weatherRes.json();
      this.data.maps = await mapsRes.json();
      this.data.bosses = await bossesRes.json();

      // 初始化各个模块
      this.initCharacters();
      this.initDistribution();
      this.initItems();
      this.initWeather();
      this.initMaps();
      this.initBosses();

    } catch (error) {
      console.error("数据加载失败，请确保使用本地服务器运行", error);
      alert("数据加载失败！请确保你正在使用本地服务器打开此页面（如 Live Server），直接双击 HTML 可能会导致跨域错误。");
    }
  },

  // 通用：切换标签
  showTab: function(id) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // 找到对应的按钮并高亮（简单处理，也可通过事件传参）
    const btns = document.querySelectorAll('nav button');
    // 这里为了简单，假设按钮顺序和ID对应，或者你在HTML传参时已经处理了视觉反馈
    // 更严谨的做法是根据 onclick 参数找到按钮元素
    event.target.classList.add('active');
  },

  // ====== 1. 角色查找模块 ======
  initCharacters: function() {
    const searchInput = document.getElementById('characterSearchInput');
    const resultList = document.getElementById('characterResultList');
    const resultsDiv = document.getElementById('characterResults');

    searchInput.addEventListener('input', function() {
      const input = this.value.trim().toLowerCase();
      resultList.innerHTML = '';
      
      if (input === '') {
        resultList.style.display = 'none';
        resultsDiv.innerHTML = '';
        return;
      }

      const found = app.data.characters.map(c => {
        let score = 0;
        const romaji = c.romaji.toLowerCase();
        const name = c.name.toLowerCase();
        const display = c.display.toLowerCase();
        const pinyin = c.pinyin.toLowerCase();

        if (romaji.startsWith(input)) score += 100;
        else if (romaji.includes(input)) score += 50;
        
        if (name === input || display === input) score += 30;
        else if (name.includes(input) || display.includes(input)) score += 20;
        
        if (pinyin.startsWith(input)) score += 10;
        else if (pinyin.includes(input)) score += 5;

        return { character: c, score: score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.character.romaji.localeCompare(b.character.romaji))
      .map(item => item.character);

      if (found.length === 0) {
        resultList.style.display = 'none';
        resultsDiv.innerHTML = '<div class="no-results">未找到角色</div>';
        return;
      }

      if (found.length > 1) {
        found.forEach(character => {
          const item = document.createElement('div');
          item.className = 'result-item';
          item.textContent = `${character.name} (${character.display})`;
          item.addEventListener('click', () => {
            app.showCharacterDetails(character);
            resultList.style.display = 'none';
          });
          resultList.appendChild(item);
        });
        resultList.style.display = 'block';
      }

      if (found.length === 1) {
        app.showCharacterDetails(found[0]);
        resultList.style.display = 'none';
      }
    });

    document.addEventListener('click', function(e) {
      if (!searchInput.contains(e.target) && !resultList.contains(e.target)) {
        resultList.style.display = 'none';
      }
    });
  },

  showCharacterDetails: function(character) {
    let html = `<div class="character-details">
      <h2>${character.name}（${character.display}）</h2>`;
    
    for (const [formKey, formData] of Object.entries(character.forms)) {
      html += `<h3>形态 ${formKey}</h3>`;
      // 属性标签颜色映射（简单示例，完善请参考CSS）
      html += formData.types.map(t => `<span class="tag ${t}">${t}</span>`).join(' ');
      
      html += `<table><tr><th>属性</th>`;
      const allAttrs = Object.keys(formData.effectiveness[formData.types[0]]);
      html += allAttrs.map(attr => `<th>${attr}</th>`).join('');
      html += '</tr>';
      
      for (const [typeName, effectMap] of Object.entries(formData.effectiveness)) {
        html += `<tr><td>${typeName}</td>`;
        html += allAttrs.map(attr => `<td>${effectMap[attr] || ''}</td>`).join('');
        html += '</tr>';
      }
      html += '</table>';
    }
    
    html += '</div>';
    document.getElementById('characterResults').innerHTML = html;
  },

  // ====== 核心功能：跳转到角色 ======
  jumpToCharacter: function(nameKeyword) {
    // 1. 首先尝试精确匹配 (匹配 display/日文, name/中文, romaji/罗马音)
    let target = this.data.characters.find(c => 
      c.display === nameKeyword || 
      c.name === nameKeyword || 
      c.romaji === nameKeyword
    );

    // 2. 如果没找到，尝试去掉前缀后匹配 (解决 "Sまりさ" -> "まりさ")
    if (!target) {
      // 定义常见的前缀字符
      const prefixes = ['N', 'E', 'S', 'P', 'D', 'A'];
      const firstChar = nameKeyword.charAt(0);

      if (prefixes.includes(firstChar)) {
        // 去掉第一个字母
        const cleanedName = nameKeyword.substring(1);
        
        target = this.data.characters.find(c => 
          c.display === cleanedName || 
          c.name === cleanedName || 
          c.romaji === cleanedName
        );
      }
    }

    // 3. 执行跳转或提示
    if (target) {
      this.showTab('characters');
      this.showCharacterDetails(target);
      // 滚动到角色区域顶部
      document.getElementById('characters').scrollIntoView({ behavior: 'smooth' });
    } else {
      alert(`未在角色库中找到: ${nameKeyword}`);
    }
  },

  // ====== 2. 人形分布模块 ======
  initDistribution: function() {
    const mapSelect = document.getElementById('mapSelect');
    const searchInput = document.getElementById('distSearchInput');
    
    // 填充下拉框
    Object.keys(this.data.distribution).forEach(map => {
      const option = document.createElement('option');
      option.value = map;
      option.textContent = map;
      mapSelect.appendChild(option);
    });

    const render = () => {
      const selectedMap = mapSelect.value;
      const keyword = searchInput.value.trim();
      const tableBody = document.getElementById('distributionTable');
      tableBody.innerHTML = '';

      let allEntries = [];
      if (selectedMap && this.data.distribution[selectedMap]) {
        allEntries = this.data.distribution[selectedMap].map(entry => ({ ...entry, map: selectedMap }));
      } else {
        for (const map in this.data.distribution) {
          allEntries = allEntries.concat(this.data.distribution[map].map(entry => ({ ...entry, map })));
        }
      }

      const filtered = allEntries.filter(entry => !keyword || entry.name.includes(keyword));

      filtered.forEach(entry => {
        const row = document.createElement('tr');
        // 🎯 关键点：给名字添加点击事件
        row.innerHTML = `
          <td><span class="clickable-name" onclick="app.jumpToCharacter('${entry.name}')">${entry.name}</span></td>
          <td>${entry.map}</td>
          <td>${entry.note}</td>
        `;
        tableBody.appendChild(row);
      });
    };

    mapSelect.addEventListener('change', render);
    searchInput.addEventListener('input', render);
    render();
  },

  // ====== 3. 隐藏物品模块 ======
  initItems: function() {
    const select = document.getElementById('hiddenMapSelect');
    const list = document.getElementById('hiddenItemsList');
    const uniqueMaps = [...new Set(this.data.items.map(x => x.map))];
    let currentIndex = 0;

    const update = () => {
      const selectedMap = uniqueMaps[currentIndex];
      select.value = selectedMap;
      const items = this.data.items.filter(x => x.map === selectedMap);
      
      list.innerHTML = `<h3>${selectedMap}</h3><ul>` + 
        items.map(x => `<li><strong>${x.place}</strong>：${x.item}</li>`).join('') + 
        `</ul>`;
    };

    uniqueMaps.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      select.appendChild(opt);
    });

    select.onchange = () => {
      currentIndex = uniqueMaps.indexOf(select.value);
      update();
    };
    
    this.prevHiddenMap = () => { currentIndex = (currentIndex - 1 + uniqueMaps.length) % uniqueMaps.length; update(); };
    this.nextHiddenMap = () => { currentIndex = (currentIndex + 1) % uniqueMaps.length; update(); };

    update();
  },

  // ====== 4. 异常/气象模块 ======
  initWeather: function() {
    const select = document.getElementById('categorySelect');
    const container = document.getElementById('statusTableContainer');

    const render = () => {
      const data = this.data.weather[select.value];
      if (!data) return;
      let html = '<table><tr><th>名称</th><th>效果</th></tr>';
      data.forEach(entry => {
        html += `<tr><td>${entry.name}</td><td>${entry.effect}</td></tr>`;
      });
      html += '</table>';
      container.innerHTML = html;
    };

    select.addEventListener('change', render);
    render();
  },

  // ====== 5. 支线地图模块 ======
  initMaps: function() {
    const select = document.getElementById('mapSelectExtra');
    const descDiv = document.getElementById('extraMapDescription');

    this.data.maps.forEach(map => {
      const opt = document.createElement('option');
      opt.value = map.name;
      opt.textContent = map.name;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const mapName = select.value;
      const mapData = this.data.maps.find(m => m.name === mapName);
      descDiv.innerHTML = '';

      if (mapData) {
        descDiv.innerHTML += `<h3>${mapData.name}</h3>`;
        mapData.description.split('\n').forEach(line => {
          descDiv.innerHTML += `<p>・${line}</p>`;
        });
        if (mapData.image) {
          mapData.image.forEach(img => {
            descDiv.innerHTML += `<img src="${img}" alt="${mapName}" style="max-width:100%; margin:10px 0;">`;
          });
        }
      }
    });
  },

  // ====== 6. 主要Boss模块 ======
  initBosses: function() {
    const locationSelect = document.getElementById('locationSelect');
    const tableBody = document.getElementById('bossTableBody');
    const noteArea = document.getElementById('noteArea');
    
    const uniquePlaces = [...new Set(this.data.bosses.map(b => b.place))];
    
    uniquePlaces.forEach(place => {
      const opt = document.createElement('option');
      opt.value = place;
      opt.textContent = place;
      locationSelect.appendChild(opt);
    });

    const fixedNote = `需要注意的敌方装备（装备名和效果）：
- 茨の符：攻击技能命中时会反弹伤害给对方。
- 速攻の符：可以在1回合内使用需要蓄力的技能。
... (其余略)`;

    const styleMap = {
      "エクストラ": "E", "パワー": "P", "ノーマル": "N", "ディフェンス": "D", "スピード": "S", "アシスト": "A"
    };

    const render = () => {
      const selectedPlace = locationSelect.value;
      const filtered = this.data.bosses.filter(b => b.place === selectedPlace);
      
      tableBody.innerHTML = '';
      noteArea.textContent = fixedNote; // 这里假设只显示固定备注，如果JSON里有动态备注可再加

      let lastName = null;
      filtered.forEach(b => {
        const row = document.createElement('tr');
        const displayName = (b.name === lastName) ? '' : b.name;
        lastName = b.name;
        
        // 🎯 关键点：给人形名添加点击事件
        row.innerHTML = `
          <td>${displayName}</td>
          <td><span class="clickable-name" onclick="app.jumpToCharacter('${b.dolls}')">${b.dolls}</span></td>
          <td>${b.decoration}</td>
          <td>${styleMap[b.style] || b.style}</td>
          <td>${b.level}</td>
        `;
        tableBody.appendChild(row);
      });
    };

    locationSelect.addEventListener('change', render);
    if(uniquePlaces.length > 0) {
        locationSelect.value = uniquePlaces[0];
        render();
    }
  }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});