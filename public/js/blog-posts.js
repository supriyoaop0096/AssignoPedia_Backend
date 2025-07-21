// Mock blog post data
const blogPosts = [
    {
        id: 1,
        title: "The Future of Academic Writing in the Digital Age",
        slug: "future-academic-writing-digital-age",
        excerpt: "Explore how technology and AI are transforming academic writing and research methodologies in higher education.",
        image: "https://source.unsplash.com/random/800x600/?education",
        author: "Dr. Sarah Johnson",
        date: "March 15, 2024",
        category: "Academic"
    },
    {
        id: 2,
        title: "Essential Tips for Writing a Stellar Research Paper",
        slug: "essential-tips-research-paper",
        excerpt: "Learn the key strategies and best practices for crafting compelling research papers that stand out.",
        image: "https://source.unsplash.com/random/800x600/?research",
        author: "Prof. Michael Chen",
        date: "March 12, 2024",
        category: "Research"
    },
    {
        id: 3,
        title: "Understanding Citation Styles: APA vs MLA vs Chicago",
        slug: "understanding-citation-styles",
        excerpt: "A comprehensive guide to different citation styles and when to use them in your academic writing.",
        image: "https://source.unsplash.com/random/800x600/?library",
        author: "Emma Williams",
        date: "March 10, 2024",
        category: "Writing Guide"
    },
    {
        id: 4,
        title: "How to Write an Effective Literature Review",
        slug: "effective-literature-review-guide",
        excerpt: "Master the art of writing literature reviews that synthesize research and provide valuable insights.",
        image: "https://source.unsplash.com/random/800x600/?books",
        author: "Dr. Robert Martinez",
        date: "March 8, 2024",
        category: "Research"
    },
    {
        id: 5,
        title: "Time Management Tips for Academic Success",
        slug: "time-management-academic-success",
        excerpt: "Discover effective strategies to balance your academic workload and achieve better results.",
        image: "https://source.unsplash.com/random/800x600/?time",
        author: "Lisa Thompson",
        date: "March 5, 2024",
        category: "Study Tips"
    },
    {
        id: 6,
        title: "The Impact of AI on Content Writing",
        slug: "ai-impact-content-writing",
        excerpt: "Exploring how artificial intelligence is revolutionizing content creation and writing processes.",
        image: "https://source.unsplash.com/random/800x600/?technology",
        author: "James Wilson",
        date: "March 1, 2024",
        category: "Technology"
    }
];

// Function to create a blog card HTML
function createBlogCard(post) {
    return `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card blog-card">
                <img src="${post.image}" class="card-img-top" alt="${post.title}">
                <div class="card-body d-flex flex-column">
                    <div class="blog-meta mb-2">
                        <span class="blog-category">${post.category}</span> • 
                        <span class="blog-date">${post.date}</span>
                    </div>
                    <h5 class="card-title">${post.title}</h5>
                    <p class="card-text flex-grow-1">${post.excerpt}</p>
                    <div class="blog-meta mt-3">
                        <span class="blog-author">By ${post.author}</span>
                    </div>
                    <a href="/blog/${post.slug}" class="read-more mt-3">Read More <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
    `;
}

// Function to render all blog posts
function renderBlogPosts() {
    const blogGrid = document.getElementById('blogGrid');
    
    // Remove loading spinner
    blogGrid.innerHTML = '';
    
    // Add blog posts
    blogPosts.forEach(post => {
        blogGrid.innerHTML += createBlogCard(post);
    });

    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.blog-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    renderBlogPosts();
}); 