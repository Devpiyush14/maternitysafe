document.addEventListener('DOMContentLoaded', () => {
    const loadingElement = document.getElementById('loading');
    const resultsElement = document.getElementById('results');
    const errorElement = document.getElementById('error');
    const settingsIcon = document.getElementById('settingsIcon');
    const settingsPanel = document.getElementById('settings');
    const mainContent = document.getElementById('mainContent');
    const apiKeyInput = document.getElementById('apiKey');
    const saveSettingsButton = document.getElementById('saveSettings');
  
    // Settings panel toggle
    settingsIcon.addEventListener('click', () => {
      if (settingsPanel.style.display === 'block') {
        settingsPanel.style.display = 'none';
        mainContent.style.display = 'block';
      } else {
        settingsPanel.style.display = 'block';
        mainContent.style.display = 'none';
        // Load saved API key
        chrome.storage.local.get(['apiKey'], (result) => {
          if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
          }
        });
      }
    });
  
    // Save API key
    saveSettingsButton.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();
      chrome.storage.local.set({ apiKey }, () => {
        settingsPanel.style.display = 'none';
        mainContent.style.display = 'block';
        analyzeCurrentPage();
      });
    });
  
    // Check for API key and analyze page
    chrome.storage.local.get(['apiKey'], (result) => {
      if (!result.apiKey) {
        loadingElement.style.display = 'none';
        settingsPanel.style.display = 'block';
        mainContent.style.display = 'none';
        return;
      }
      analyzeCurrentPage();
    });
  });
  
  async function analyzeCurrentPage() {
    const loadingElement = document.getElementById('loading');
    const resultsElement = document.getElementById('results');
    const errorElement = document.getElementById('error');
    const productNameElement = document.getElementById('productName');
    const ingredientsElement = document.getElementById('ingredients');
    const resultElement = document.getElementById('Result');
  
    try {
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url;
  
      // Get API key from storage
      const { apiKey } = await chrome.storage.local.get(['apiKey']);
      if (!apiKey) {
        throw new Error('Please set your OpenAI API key in the settings');
      }
  
      // Prepare prompt for ChatGPT
      const prompt = `Please analyze this product page URL: ${url}
      Extract and return ONLY the following information in this exact JSON format:
      {
        "productName": "the name of the product",
        "ingredients": "list of all ingredients in tabular format with culumns : Ingredient name, Quantity, Unit"
        "Result": "Show 'Safe' if the product is safe to use in pregnancy, Show 'Not Safe' if the product is not safe to use in pregnancy"
        If you cannot find the information, use "Not found" as the value.`;
  
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to connect to OpenAI API');
      }
  
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
  
      // Display results
      loadingElement.style.display = 'none';
      resultsElement.style.display = 'block';
      
      productNameElement.textContent = result.productName || 'Not found';
      ingredientsElement.textContent = result.ingredients || 'Not found';
      resultElement.textContent = result.Result || 'Not found';
  
    } catch (error) {
      loadingElement.style.display = 'none';
      errorElement.textContent = error.message;
      errorElement.style.display = 'block';
      console.error('Error:', error);
    }
  }