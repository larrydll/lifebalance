import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { Dimension, ActionPlanItem } from "../types";

// Initialize client lazily to prevent app crash if API key is missing
const getGenAI = () => {
  // Try standard Vite env var first, then fallback to process.env injection
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey || apiKey === 'undefined') {
    return null;
  }
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI:", error);
    return null;
  }
};

export const generateActionPlan = async (dimensions: Dimension[]): Promise<ActionPlanItem[]> => {
  const gaps = dimensions
    .map(d => ({ ...d, gap: d.targetScore - d.currentScore }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  // Fallback function for static data with debug info
  const getFallbackData = (errorMsg?: string): ActionPlanItem[] => gaps.map((g, idx) => ({
    id: `plan-${idx}`,
    category: g.name,
    title: idx === 0 && errorMsg ? `${g.name} (API Error)` : `${g.name}: 差距为 ${g.gap}`,
    priority: idx + 1,
    gap: g.gap,
    status: (g.gap > 5 ? 'critical' : g.gap > 2 ? 'steady' : 'moderate') as 'critical' | 'steady' | 'moderate',
    tasks: errorMsg && idx === 0
      ? [`错误详情: ${errorMsg}`, "请检查 API Key 和 代理配置", "请确保已重新部署 (Redeploy)"]
      : [`提升${g.name}的具体方案1`, `提升${g.name}的具体方案2`, `提升${g.name}的具体方案3`],
    imageUrl: "https://picsum.photos/400/200"
  }));

  try {
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    // Normalize Base URL: remove trailing slash
    // Hardcoded user's proxy as fallback to ensure it works even if Env Var fails
    let baseUrl = import.meta.env.VITE_GEMINI_API_BASE_URL || 'https://throbbing-lab-8b07.dailinlong.workers.dev' || '/api/proxy';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const isCustomProxy = baseUrl && !baseUrl.includes('googleapis.com');

    if (!apiKey || apiKey === 'undefined') {
      return getFallbackData("API Key MISSING");
    }
    apiKey = apiKey.trim();

    const prompt = `你是一位擅长积极心理学的资深生活教练，善于通过"成长型思维"和"优势视角"来激发用户的潜能。
    
    请根据以下用户的生命维度评分（当前 vs 目标），为差距最大的前三个领域制定具体的年度行动计划。
    
    领域评分:
    ${gaps.map(g => `${g.name}: 当前 ${g.currentScore}, 目标 ${g.targetScore}, 差距 ${g.gap}`).join('\n')}
  
    请返回一个JSON数组，格式如下：
    [
      {
        "category": "领域名称",
        "title": "充满力量的行动标题 (例如: 开启心流体验之旅)",
        "status": "critical | steady | moderate",
        "tasks": ["积极行动1", "积极行动2", "积极行动3"]
      }
    ]
    
    要求：
    1. 每一项必须严格包含 3 个具体的行动方案。
    2. 方案应融合积极心理学概念（如：感恩、心流、优势运用、社会支持）。
    3. 语言要温暖、积极、赋能，避免说教和焦虑贩卖。
    4. 任务应该是微习惯，简单易执行。`;

    // Updated with models CONFIRMED to exist by ListModels debug
    const modelsToTry = [
      "gemini-flash-latest",
      "gemini-2.0-flash",
      "gemini-2.5-flash"
    ];

    let text = "";
    let lastError;

    // STRATEGY 1: Proxy Mode (Raw Fetch) - Prioritize if Base URL is set
    if (isCustomProxy) {
      console.log(`Using Proxy Mode: ${baseUrl}`);
      for (const modelName of modelsToTry) {
        try {
          console.log(`Proxy Attempt: ${modelName}`);
          const response = await fetch(`${baseUrl}/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          if (response.ok) {
            const json = await response.json();
            text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              console.log(`Success with proxy model: ${modelName}`);
              break;
            }
          } else {
            const errText = await response.text();
            console.warn(`Proxy ${modelName} failed:`, errText);

            // Smart Debug: If 404, try to list available models to see what IS working
            if (response.status === 404) {
              try {
                console.log("Attempting to list available models for debugging...");
                const listResponse = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`);
                if (listResponse.ok) {
                  const listData = await listResponse.json();
                  const availableModels = listData.models?.map((m: any) => m.name.replace('models/', '')) || [];
                  lastError = new Error(`Model Not Found. Available models: ${availableModels.join(', ')}`);
                  continue; // Skip standard error setting
                } else {
                  lastError = new Error(`404 Error. ListModels also failed: ${await listResponse.text()}`);
                  continue;
                }
              } catch (listErr) {
                console.error("ListModels check failed", listErr);
              }
            }

            lastError = new Error(`Proxy Error [${response.status}]: ${errText.slice(0, 500)}`);
          }
        } catch (e: any) {
          console.warn(`Proxy ${modelName} connection error:`, e);
          lastError = e;
        }
      }
    }

    // STRATEGY 2: SDK Mode (Fallback or Primary if no proxy)
    // Only run if Proxy Mode failed or wasn't used
    if (!text) {
      // If we already tried proxy and failed, stop here to avoid confusing SDK errors
      // unless user explicitly wants fallback. But for Vercel, SDK is guaranteed to fail.
      if (isCustomProxy && lastError) {
        console.log("Proxy mode failed, not attempting SDK due to custom proxy setting.");
        throw lastError;
      }

      // ... strict SDK logic removed for brevity, assuming Proxy Mode is the fix ...
      // But keeping it for backward compat if proxy not set
      const genAI = getGenAI();
      if (genAI) {
        console.log("Attempting SDK mode...");
        for (const modelName of modelsToTry) {
          try {
            console.log(`SDK Attempt: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            text = response.text();
            if (text) {
              console.log(`Success with SDK model: ${modelName}`);
              break;
            }
          } catch (e: any) {
            console.warn(`SDK ${modelName} failed:`, e.message);
            lastError = e;
            if (e.message.includes('403') || e.message.includes('API key')) {
              // If it's a key error, no need to retry other models
              throw e;
            }
          }
        }
      } else {
        console.log("Using fallback data due to missing AI client (SDK not initialized)");
        const keyStatus = apiKey ? (apiKey === 'undefined' ? 'UNDEFINED_STRING' : 'PRESENT') : 'MISSING';
        return getFallbackData(`CLT_ERR: Key ${keyStatus} (Check VITE_GEMINI_API_KEY)`);
      }
    }

    if (!text && lastError) {
      throw lastError;
    }

    // Extract JSON array using regex to ignore conversational preamble (e.g. "Okay, here is the JSON...")
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const cleanText = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, '').replace(/```/g, '').trim();

    let data;
    try {
      data = JSON.parse(cleanText || "[]");
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw Text:", text);
      throw new Error("AI response was not valid JSON. Please try again.");
    }

    // Map with image placeholders
    const images = [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1000"
    ];

    return data.map((item: any, idx: number) => ({
      ...item,
      id: `plan-${idx}`,
      priority: idx + 1,
      gap: gaps[idx].gap,
      imageUrl: images[idx % images.length],
      status: item.status as 'critical' | 'steady' | 'moderate'
    }));
  } catch (error: any) {
    console.error("Gemini Plan Generation Error:", error);
    return getFallbackData(error.message || "Unknown API Error");
  }
};
