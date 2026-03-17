# 🌐 Sameen Ahmed Ashraf's GitHub Pages Portfolio

This is my personal portfolio website hosted on GitHub Pages at `sameenashraf.github.io`.

## 🚀 Quick Start

### 1. Prerequisites
- GitHub account
- Git installed on your machine
- Basic knowledge of GitHub Pages

### 2. Deploy to GitHub Pages

1. **Create a new repository** on GitHub named `sameenashraf.github.io` (replace with your GitHub username)
2. **Clone this repository** into that GitHub repository
3. **Push to main branch** - GitHub Pages will automatically build and deploy your site

```bash
# Clone this repo
git clone <this-repo-url> sameenashraf.github.io

# Navigate to folder
cd sameenashraf.github.io

# Push to your new repo
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-USERNAME.github.io.git
git push -u origin main
```

### 3. Your site will be live at:
👉 `https://sameenashraf.github.io` (or your username)

---

## ✏️ Customize Your Portfolio

### 1. **Update Personal Info** (`_config.yml`)
```yaml
title: "Your Name — Your Title"
author: "Your Name"
github_username: "your-github-username"
linkedin_username: "your-linkedin-username"
```

### 2. **Update About Section** (`index.md`)
- Replace the profile picture at `assets/images/profile.jpg` with your own
- Update the about text with your bio
- Customize skills and social links

### 3. **Add Your Projects** (`_data/projects.yml`)
Update the YAML file with your actual GitHub projects:

```yaml
- title: "Your Project Name"
  link: "https://github.com/your-username/repo-name"
  description: "Brief description of what your project does"
  stack: "Python · SQL · Tableau · Docker"
  image: "/assets/images/project-name.jpg"
  screenshot: "/assets/images/project-name-screenshot.jpg"
```

**Tips:**
- You can use placeholder images or add your own to `assets/images/`
- Include up to 4 projects for best layout
- Add links to your actual GitHub repositories

### 4. **Add Your Certificates** (`_data/certificates.yml`)
Update with certificates from your LinkedIn profile:

```yaml
- title: "Certificate Name"
  issuer: "Issuing Organization"
  date: "2024"
  link: "https://www.linkedin.com/in/your-username/details/certifications/"
  image: "/assets/images/certificate-name.jpg"
  screenshot: "/assets/images/certificate-screenshot.jpg"
```

---

## 📁 Project Structure

```
sameenashraf.github.io/
├── _config.yml           # Site configuration
├── _data/
│   ├── projects.yml      # Your projects data
│   └── certificates.yml  # Your certificates data
├── _includes/
│   └── head.html         # HTML head template
├── _layouts/
│   └── default.html      # Main layout template
├── assets/
│   ├── css/
│   │   └── styles.css    # Site styling
│   └── images/           # Your images go here
├── index.md              # Home page content
└── README.md             # This file
```

---

## 🎨 Customization Tips

### Change Colors
Edit the CSS variables in `assets/css/styles.css`:
```css
:root {
  --bg: #0b1220;          /* Background */
  --panel: #0f172a;       /* Card background */
  --accent: #60a5fa;      /* Primary color */
  --text: #e5e7eb;        /* Text color */
  --muted: #94a3b8;       /* Secondary text */
}
```

### Add Social Links
In `index.md`, add more social links to the `.social-links` section:
```html
<a href="https://twitter.com/your-handle" target="_blank" aria-label="Twitter">
  <i class="fa-brands fa-twitter"></i>
</a>
```

### Update Navigation
Edit the navigation in `_layouts/default.html` to add/remove sections

---

## 📝 Notes

- **No build required** - Just push to GitHub and your site updates automatically
- **Use markdown** - `index.md` is in markdown format
- **Images**: Add your images to `assets/images/` and reference them in your YAML files
- **Dark/Light mode**: The site automatically respects system preferences

---

## 🔗 Useful Links

- [GitHub Pages Documentation](https://pages.github.com)
- [Jekyll Documentation](https://jekyllrb.com/)
- [FontAwesome Icons](https://fontawesome.com/icons) - For social icons
- [Markdown Guide](https://www.markdownguide.org/)

---

## 📧 Support

For issues or questions about GitHub Pages, visit the [GitHub Community Forum](https://github.community).

---

**Happy coding!** 🎉
