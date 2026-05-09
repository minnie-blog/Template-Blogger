/*!
 * list-chapter-for-info-page.js — Mục lục truyện tự động cho Blogger
 * Host lên GitHub → dùng qua jsDelivr CDN
 * https://cdn.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@main/toc.js
 *
 * Cách dùng trong Blogger Page/Post:
 *   <div id="toc-root"
 *        data-blog-id="1234567890"
 *        data-api-key="AIza..."
 *        data-story-label="ten-truyen"
 *        data-chapter-label="chapter">
 *   </div>
 *   <script src="https://cdn.jsdelivr.net/gh/YOUR-USER/YOUR-REPO@main/toc.js" defer></script>
 */
(function () {
  'use strict';

  const PAGE_SIZE = 500;

  function init() {
    const root = document.getElementById('toc-root');
    if (!root) return;

    const cfg = {
      blogId:       root.dataset.blogId,
      apiKey:       root.dataset.apiKey,
      storyLabel:   root.dataset.storyLabel   || 'chapter',
      chapterLabel: root.dataset.chapterLabel || 'chapter',
    };

    if (!cfg.blogId || !cfg.apiKey) {
      root.innerHTML = '<p style="color:#c0392b;font-size:13px">blogger-toc.js: thiếu data-blog-id hoặc data-api-key.</p>';
      return;
    }

    // Tạo cấu trúc DOM
    const loading = document.createElement('div');
    loading.id          = 'toc-loading';
    loading.textContent = 'Đang tải mục lục...';
    loading.style.textAlign = 'center';

    const list = document.createElement('ul');
    list.className    = 'listChapter';
    list.style.display = 'none';

    const error = document.createElement('p');
    error.style.cssText = 'display:none;color:#c0392b;font-size:13px';

    root.appendChild(loading);
    root.appendChild(list);
    root.appendChild(error);

    function showError(msg) {
      loading.style.display = 'none';
      error.textContent     = msg;
      error.style.display   = '';
    }

    function parsePost(post) {
      const div = document.createElement('div');
      div.innerHTML = post.content || '';
      const h1 = div.querySelector('h1.chapter-title');
      if (!h1) return null;

      let vol = 'Chưa phân quyển', volNum = 0;
      h1.className.split(/\s+/).forEach(cls => {
        const m = cls.match(/^vol(\d+)$/i);
        if (m) { volNum = parseInt(m[1], 10); vol = 'Quyển ' + m[1]; }
      });

      return {
        title:   h1.textContent.trim(),
        url:     post.url,
        published: new Date(post.published),
        vol, volNum,
        chapNum: parseInt((h1.textContent.match(/\d+/) || [0])[0], 10)
      };
    }

    function renderTOC(posts) {
      const volumes = {};
      posts.forEach(post => {
        const p = parsePost(post);
        if (!p) return;
        if (!volumes[p.vol]) volumes[p.vol] = { num: p.volNum, chapters: [] };
        volumes[p.vol].chapters.push({ title: p.title, url: p.url, chapNum: p.chapNum });
      });

      const volKeys = Object.keys(volumes).sort((a, b) => volumes[b].num - volumes[a].num);

      if (!volKeys.length) {
        showError('Không tìm thấy chương nào có thẻ <h1 class="chapter-title volX">.');
        return;
      }

      let html = '';
      
      volKeys.forEach(vol => {
        // Chỉ hiện dòng tên quyển nếu có volX, bỏ qua nhãn "Chưa phân quyển"
        if (vol !== 'Chưa phân quyển') {
          html += `<p class="volumne">${vol}</p>`;
        }
      
        volumes[vol].chapters
          .sort((a, b) => b.published - a.published)
          .forEach(ch => { html += `<a href="${ch.url}">${ch.title}</a><br />`; });
      });
      
      list.innerHTML     = html;
      loading.style.display = 'none';
      list.style.display    = '';
    }

    async function fetchAllPosts() {
      const BASE   = `https://www.googleapis.com/blogger/v3/blogs/${cfg.blogId}/posts`;
      const labels = [cfg.chapterLabel, cfg.storyLabel].join(',');
      let allPosts = [], pageToken = null;

      do {
        const params = new URLSearchParams({
          key: cfg.apiKey, labels, maxResults: PAGE_SIZE,
          fetchBodies: 'true', status: 'live',
          fields: 'nextPageToken,items(title,url,content,published)'
        });
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(`${BASE}?${params}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        allPosts  = allPosts.concat(data.items || []);
        pageToken = data.nextPageToken || null;
        loading.textContent = `Đang tải... (${allPosts.length} chương)`;
      } while (pageToken);

      return allPosts;
    }

    fetchAllPosts()
      .then(posts => {
        if (!posts.length) { showError('Không tìm thấy bài đăng. Kiểm tra lại API Key, Blog ID và nhãn.'); return; }
        renderTOC(posts);
      })
      .catch(err => showError('Lỗi: ' + err.message));
  }

  // Chờ DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
