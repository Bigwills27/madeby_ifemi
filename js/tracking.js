const chatMessages = document.getElementById("chatMessages");
const orderIdInput = document.getElementById("orderIdInput");
const trackOrderButton = document.getElementById("trackOrderButton");
const loadingIndicator = document.getElementById("loadingIndicator");

const API_BASE_URL = "https://ifemade-server.onrender.com";

// Function to format date from an ISO string
function formatDate(dateString) {
  if (!dateString || typeof dateString !== "string") {
    return "N/A";
  }
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error("Parsed invalid date from string:", dateString);
      return "Invalid Date";
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    console.error("Error formatting date string:", dateString, e);
    return "Error in Date";
  }
}

// Function to format price from a number
function formatPrice(priceValue, currency = "N") {
  if (typeof priceValue !== "number" || isNaN(priceValue)) {
    // Attempt to parse if it's a string number, though API should send number
    const parsedVal = parseFloat(priceValue);
    if (isNaN(parsedVal)) {
      return currency + "0 (Invalid)";
    }
    priceValue = parsedVal;
  }
  return currency + priceValue.toLocaleString();
}

// Function to add a message to the chat
function addMessage(content, isUser = false, isHtml = false) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("flex", isUser ? "justify-end" : "justify-start");

  const bubbleDiv = document.createElement("div");
  bubbleDiv.classList.add(
    "p-3",
    "message-bubble",
    isUser ? "user-bubble" : "bot-bubble"
  );

  if (isHtml) {
    bubbleDiv.innerHTML = content;
  } else {
    bubbleDiv.textContent = content;
  }

  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
}

// Function to display order details
function displayOrderDetails(order) {
  // Corrected: Access _id directly as it's a string
  addMessage(
    `Okay, I found your order: <strong>#${
      order._id ? order._id.slice(-8) : "N/A"
    }</strong>! Here are the details:`,
    false,
    true
  );

  let summary = `<p class="text-sm"><strong>Customer:</strong> ${
    order.customerName || "N/A"
  }</p>`;
  summary += `<p class="text-sm"><strong>Phone:</strong> ${
    order.phoneNumber || "N/A"
  }</p>`;
  summary += `<p class="text-sm"><strong>Delivery Method:</strong> ${
    order.deliveryMethod || "N/A"
  }</p>`;
  // Corrected: Pass order.total (number) directly to formatPrice
  summary += `<p class="text-sm"><strong>Total Amount:</strong> ${formatPrice(
    order.total
  )}</p>`;

  let paymentStatusText = "N/A";
  if (order.paymentStatus === "payment_made") {
    paymentStatusText = "Paid";
    if (order.paymentConfirmedAt) {
      // Corrected: Pass order.paymentConfirmedAt (ISO string) directly to formatDate
      paymentStatusText += ` (Confirmed: ${formatDate(
        order.paymentConfirmedAt
      )})`;
    }
  } else if (order.paymentStatus) {
    paymentStatusText = order.paymentStatus.replace(/_/g, " ");
  }
  summary += `<p class="text-sm"><strong>Payment Status:</strong> ${paymentStatusText}</p>`;
  // Corrected: Pass order.orderDate (ISO string) directly to formatDate
  summary += `<p class="text-sm"><strong>Order Date:</strong> ${formatDate(
    order.orderDate
  )}</p>`;
  addMessage(summary, false, true);

  if (order.items && order.items.length > 0) {
    addMessage("Here are the items in your order:", false);
    order.items.forEach((item) => {
      const quantityDisplay =
        typeof item.quantity === "number" ? item.quantity : "N/A";
      let itemHtml = `
                <div class="item-card p-3 my-2">
                    <div class="flex items-start space-x-3">
                        <img src="${
                          item.image ||
                          "https://placehold.co/80x80/374151/FFF?text=Item"
                        }" alt="${
        item.name || "Item"
      }" class="w-20 h-20 object-cover rounded-md border border-gray-500" onerror="this.onerror=null;this.src='https://placehold.co/80x80/374151/FFF?text=Error';">
                        <div class="flex-1">
                            <p class="font-semibold text-base">${
                              item.name || "Unnamed Item"
                            }</p>
                            <p class="text-xs text-gray-300">Price: ${formatPrice(
                              item.price
                            )}</p>
                            <p class="text-xs text-gray-300">Quantity: ${quantityDisplay}</p>
                            ${
                              item.size
                                ? `<p class="text-xs text-gray-300">Size: ${item.size}</p>`
                                : ""
                            }
                            ${
                              item.color
                                ? `<p class="text-xs text-gray-300">Color: ${item.color}</p>`
                                : ""
                            }
                        </div>
                    </div>
                    ${
                      item.customMessage
                        ? `<p class="text-xs text-gray-300 mt-2 pt-2 border-t border-gray-500"><em>Custom Message: ${item.customMessage}</em></p>`
                        : ""
                    }
                </div>
            `;
      addMessage(itemHtml, false, true);
    });
  } else {
    addMessage("There are no items in this order.", false);
  }
}

trackOrderButton.addEventListener("click", async () => {
  const orderId = orderIdInput.value.trim();
  if (!orderId) {
    addMessage("Please enter an Order ID.", false);
    return;
  }

  addMessage(`Looking for order: #${orderId}`, true);
  orderIdInput.value = ""; // Clear input
  loadingIndicator.classList.remove("hidden"); // Show loader
  trackOrderButton.disabled = true;
  trackOrderButton.classList.add("opacity-50", "cursor-not-allowed");

  try {
    // IMPORTANT: Replace '/api/orders/' with your actual API base URL if it's different
    // For example, if your backend is on http://localhost:3000, use:
    // const response = await fetch(`http://localhost:3000/api/orders/${orderId}`);
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to parse error response" }));
      if (response.status === 404) {
        addMessage(
          `Sorry, I couldn't find an order with ID <strong>#${orderId}</strong>. Please check the ID and try again.`,
          false,
          true
        );
      } else {
        addMessage(
          `Server error (${response.status}): ${
            errorData.error || errorData.message || "Unknown error"
          }`,
          false,
          true
        );
      }
    } else {
      const order = await response.json();
      if (order && order._id) {
        // Check if order and order._id exist
        displayOrderDetails(order);
      } else {
        addMessage(
          `Received an unexpected response structure for order ID <strong>#${orderId}</strong>. The order data or ID is missing.`,
          false,
          true
        );
        console.error("Unexpected order structure:", order);
      }
    }
  } catch (error) {
    console.error("Error fetching order:", error);
    addMessage(
      `Oops! Something went wrong while fetching order <strong>#${orderId}</strong>. Please try again later. (Error: ${error.message})`,
      false,
      true
    );
  } finally {
    loadingIndicator.classList.add("hidden"); // Hide loader
    trackOrderButton.disabled = false;
    trackOrderButton.classList.remove("opacity-50", "cursor-not-allowed");
  }
});

// Allow pressing Enter to submit
orderIdInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevent default form submission if it were in a form
    trackOrderButton.click();
  }
});
