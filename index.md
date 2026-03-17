---
title: "Home"
---

<!-- Inline carousel-only styles (kept here so they don't clash with grid) -->
<style>
  .carousel { position: relative; overflow: hidden; }
  .carousel-track {
    display: flex;
    gap: 1rem;
    flex-wrap: nowrap;        /* keep in one row */
    overflow-x: auto;
    scroll-behavior: smooth;
    padding-bottom: .25rem;
    -ms-overflow-style: none; /* IE/Edge */
    scrollbar-width: none;    /* Firefox */
  }
  .carousel-track::-webkit-scrollbar { display: none; } /* WebKit */
  .carousel .card { flex: 0 0 300px; } /* slide width */
</style>

<section id="about" class="section">
  <div class="about-container">
    <img src="{{ '/assets/images/headshot.png' | relative_url }}"
         alt="Sameen Ahmed Ashraf"
         class="profile-pic">

    <div class="about-text">
      <h1>Hey, I'm Sameen Ahmed Ashraf 👋</h1>
      <p class="subtitle">Data Analyst | Data Engineer | Analytics Enthusiast</p>
      <p class="bio">Transforming data into actionable insights. I specialize in building end-to-end data pipelines, developing interactive dashboards, and applying machine learning to solve real-world problems. Currently exploring advanced analytics and AI-driven decision-making.</p>
      <p><strong>Core skills:</strong> Python · SQL · Tableau · Data Analytics · ETL · Machine Learning · AWS · GCP</p>

      <p class="social-links">
        <a href="https://www.linkedin.com/in/sameen-ahmed-ashraf/" target="_blank" aria-label="LinkedIn">
          <i class="fa-brands fa-linkedin"></i>
        </a>
        <a href="https://github.com/{{ site.github_username }}" target="_blank" aria-label="GitHub">
          <i class="fa-brands fa-github"></i>
        </a>
        <a href="https://public.tableau.com/app/profile/sameen.ahmed.ashraf" target="_blank" aria-label="Tableau">
          <img src="{{ '/assets/images/tableau.png' | relative_url }}" alt="Tableau" class="nav-tableau-icon">
        </a>
      </p>
    </div>
  </div>
</section>

<!-- ===================== Companies & Universities ===================== -->
<section id="companies" class="section">
  <div class="section-header">
    <h2>🏢 Companies</h2>
  </div>
  <div class="orgs-list">
    <div class="org-item">
      <img src="{{ '/assets/images/NXP_Logo_RGB_Colour.png' | relative_url }}" alt="NXP Semiconductors" class="org-logo">
      <p class="org-name">NXP Semiconductors</p>
    </div>
    <div class="org-item">
      <img src="{{ '/assets/images/UT_Dallas_2_Color_Emblem_-_SVG_Brand_Identity_File.svg' | relative_url }}" alt="The University of Texas at Dallas" class="org-logo">
      <p class="org-name">The University of Texas at Dallas</p>
    </div>
  </div>
</section>

<section id="universities" class="section">
  <div class="section-header">
    <h2>🎓 Universities</h2>
  </div>
  <div class="orgs-list">
    <div class="org-item">
      <img src="{{ '/assets/images/UT_Dallas_2_Color_Emblem_-_SVG_Brand_Identity_File.svg' | relative_url }}" alt="The University of Texas at Dallas" class="org-logo">
      <p class="org-name">The University of Texas at Dallas</p>
    </div>
    <div class="org-item">
      <img src="{{ '/assets/images/GTVertical_RGB.svg' | relative_url }}" alt="Georgia Institute of Technology" class="org-logo">
      <p class="org-name">Georgia Institute of Technology</p>
    </div>
  </div>
</section>

<!-- ===================== Projects ===================== -->
<section id="projects" class="section">
  <div class="section-header">
    <h2>🚀 Projects</h2>
    <a class="view-all" href="https://github.com/{{ site.github_username }}" target="_blank" rel="noopener">All repos →</a>
  </div>

  {% assign projects_count = site.data.projects | size %}
  {% if projects_count > 4 %}
    <div class="carousel">
      <button class="scroll-btn left" data-target="#projects-track" aria-label="Scroll projects left">‹</button>
      <div id="projects-track" class="carousel-track" role="region" aria-label="Projects list">
        {% for item in site.data.projects %}
        <article class="card">
          <a class="thumb" href="{{ item.link }}" target="_blank" rel="noopener" aria-label="Open project">
            <img src="{{ item.image | default: '/assets/images/placeholder_project.jpg' | relative_url }}"
                 alt="{{ item.title | escape }} thumbnail"
                 loading="lazy"
                 {% if item.preview_gif %}data-preview="{{ item.preview_gif | relative_url }}"{% endif %}>
          </a>
          <div class="card-body">
            <h3 class="card-title"><a href="{{ item.link }}" target="_blank" rel="noopener">{{ item.title }}</a></h3>
            <p class="card-text">{{ item.description }}</p>
            {% if item.stack %}<p class="card-tags">{{ item.stack }}</p>{% endif %}
            <div class="card-actions">
              {% if item.screenshot %}<a href="#" class="btn ghost" data-lightbox-src="{{ item.screenshot | relative_url }}">Preview</a>{% endif %}
              <a class="btn" href="{{ item.link }}" target="_blank" rel="noopener">Open</a>
            </div>
          </div>
        </article>
        {% endfor %}
      </div>
      <button class="scroll-btn right" data-target="#projects-track" aria-label="Scroll projects right">›</button>
    </div>
  {% else %}
    <div class="gallery">
      {% for item in site.data.projects %}
      <article class="card">
        <a class="thumb" href="{{ item.link }}" target="_blank" rel="noopener" aria-label="Open project">
          <img src="{{ item.image | default: '/assets/images/placeholder_project.jpg' | relative_url }}"
               alt="{{ item.title | escape }} thumbnail" loading="lazy">
        </a>
        <div class="card-body">
          <h3 class="card-title"><a href="{{ item.link }}" target="_blank" rel="noopener">{{ item.title }}</a></h3>
          <p class="card-text">{{ item.description }}</p>
          {% if item.stack %}<p class="card-tags">{{ item.stack }}</p>{% endif %}
          <div class="card-actions">
            {% if item.screenshot %}<a href="#" class="btn ghost" data-lightbox-src="{{ item.screenshot | relative_url }}">Preview</a>{% endif %}
            <a class="btn" href="{{ item.link }}" target="_blank" rel="noopener">Open</a>
          </div>
        </div>
      </article>
      {% endfor %}
    </div>
  {% endif %}
</section>

<!-- ===================== Certificates ===================== -->
<section id="certificates" class="section">
  <div class="section-header">
    <h2>🏆 Certificates</h2>
    <a class="view-all" href="https://www.linkedin.com/in/{{ site.linkedin_username }}/details/certifications/" target="_blank" rel="noopener">All certificates →</a>
  </div>

  {% assign certificates_count = site.data.certificates | size %}
  {% if certificates_count > 4 %}
    <div class="carousel">
      <button class="scroll-btn left" data-target="#certificates-track" aria-label="Scroll certificates left">‹</button>
      <div id="certificates-track" class="carousel-track" role="region" aria-label="Certificates list">
        {% for item in site.data.certificates %}
        <article class="card">
          <a class="thumb" href="{{ item.link }}" target="_blank" rel="noopener" aria-label="Open certificate">
            <img src="{{ item.image | default: '/assets/images/placeholder_certificate.jpg' | relative_url }}"
                 alt="{{ item.title | escape }} certificate"
                 loading="lazy">
          </a>
          <div class="card-body">
            <h3 class="card-title"><a href="{{ item.link }}" target="_blank" rel="noopener">{{ item.title }}</a></h3>
            <p class="card-text">{{ item.issuer }}</p>
            {% if item.date %}<p class="card-tags">{{ item.date }}</p>{% endif %}
            <div class="card-actions">
              {% if item.screenshot %}<a href="#" class="btn ghost" data-lightbox-src="{{ item.screenshot | relative_url }}">Preview</a>{% endif %}
              <a class="btn" href="{{ item.link }}" target="_blank" rel="noopener">View</a>
            </div>
          </div>
        </article>
        {% endfor %}
      </div>
      <button class="scroll-btn right" data-target="#certificates-track" aria-label="Scroll certificates right">›</button>
    </div>
  {% else %}
    <div class="gallery">
      {% for item in site.data.certificates %}
      <article class="card">
        <a class="thumb" href="{{ item.link }}" target="_blank" rel="noopener" aria-label="Open certificate">
          <img src="{{ item.image | default: '/assets/images/placeholder_certificate.jpg' | relative_url }}"
               alt="{{ item.title | escape }} certificate" loading="lazy">
        </a>
        <div class="card-body">
          <h3 class="card-title"><a href="{{ item.link }}" target="_blank" rel="noopener">{{ item.title }}</a></h3>
          <p class="card-text">{{ item.issuer }}</p>
          {% if item.date %}<p class="card-tags">{{ item.date }}</p>{% endif %}
          <div class="card-actions">
            {% if item.screenshot %}<a href="#" class="btn ghost" data-lightbox-src="{{ item.screenshot | relative_url }}">Preview</a>{% endif %}
            <a class="btn" href="{{ item.link }}" target="_blank" rel="noopener">View</a>
          </div>
        </div>
      </article>
      {% endfor %}
    </div>
  {% endif %}
</section>

<!-- Tiny helper script for arrow buttons -->
<script>
(function () {
  function init(btn) {
    var targetSel = btn.getAttribute('data-target');
    var track = document.querySelector(targetSel);
    if (!track) return;
    var step = Math.max(300, Math.floor(track.clientWidth * 0.9));

    btn.addEventListener('click', function () {
      track.scrollBy({ left: btn.classList.contains('left') ? -step : step, behavior: 'smooth' });
    });

    function update() {
      var max = track.scrollWidth - track.clientWidth - 1;
      var x = track.scrollLeft;
      var leftBtn = track.parentElement.querySelector('.scroll-btn.left');
      var rightBtn = track.parentElement.querySelector('.scroll-btn.right');
      if (leftBtn) leftBtn.disabled = x <= 0;
      if (rightBtn) rightBtn.disabled = x >= max;
    }
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  document.querySelectorAll('.scroll-btn').forEach(init);
})();
</script>
