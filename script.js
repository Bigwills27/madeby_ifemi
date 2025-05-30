// Add smooth scrolling and interactive elements
document.addEventListener("DOMContentLoaded", function () {
  // Add hover effects to buttons
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((button) => {
    button.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-4px)";
    });
    button.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)";
    });
  });

  // Add hover effects to Product-img
  const productImg = document.querySelectorAll(".product-img");
  productImg.forEach((img) => {
    img.addEventListener("mouseenter", function () {
      this.style.filter = "grayscale(0)";
    });
    img.addEventListener("mouseleave", function () {
      this.style.filter = "grayscale(1)";
    });
  });

  //   The one with overlay blocking
  const overlay = document.querySelector(".overlay");
  overlay.addEventListener("mouseenter", () => {
    console.log("hovering");
    productImg[2].style.filter = "grayscale(0)";
  });
  overlay.addEventListener("mouseleave", function () {
    productImg[2].style.filter = "grayscale(1)";
  });

  // Add click handlers for navigation
  const viewAllLink = document.querySelector(".view-all");
  if (viewAllLink) {
    viewAllLink.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("View all products clicked");
    });
  }

  // Add cart functionality
  const cartElement = document.querySelector(".cart");
  if (cartElement) {
    cartElement.addEventListener("click", function () {
      console.log("Cart clicked");
    });
  }

  // Add search functionality
  const searchIcon = document.querySelector(".search-icon");
  if (searchIcon) {
    searchIcon.addEventListener("click", function () {
      console.log("Search clicked");
    });
  }
});
