import { api } from './api';

class CodeFileService {
  /**
   * Creează un fișier temporar pentru review
   */
  async createTempFile(fileName, content) {
    try {
      const response = await api.post('/CodeFile/create', {
        fileName,
        content,
      });
      
      if (!response.data || !response.data.fileId) {
        console.error("Invalid response from createTempFile:", response.data);
        throw new Error("Failed to create temp file - invalid response");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error creating temp file:", error);
      console.error("Error details:", {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
      
      // Check if it's an auth issue (302 or 401)
      if (error.response?.status === 302 || error.response?.status === 401) {
        const authError = new Error("Autentificare necesară. Te rugăm să te loghezi din nou.");
        authError.name = "AuthenticationError";
        authError.status = error.response?.status;
        throw authError;
      }
      
      // Re-throw with a more user-friendly message
      if (error.message && error.message.includes("Authentication required")) {
        throw error;
      }
      
      throw new Error(`Eroare la crearea fișierului temporar: ${error.message || "Eroare necunoscută"}`);
    }
  }

  /**
   * Obține conținutul curent al fișierului
   */
  async getCurrentContent(fileId) {
    const response = await api.get(`/CodeFile/${fileId}/current`);
    return response.data;
  }

  /**
   * Obține conținutul original al fișierului
   */
  async getOriginalContent(fileId) {
    const response = await api.get(`/CodeFile/${fileId}/original`);
    return response.data;
  }

  /**
   * Actualizează conținutul curent
   */
  async updateCurrentContent(fileId, content) {
    const response = await api.post(`/CodeFile/${fileId}/update`, {
      content,
    });
    return response.data;
  }

  /**
   * Aplică un patch pe fișierul curent
   */
  async applyPatch(fileId, patch) {
    if (!fileId || fileId === 'undefined') {
      console.error("Invalid fileId:", fileId);
      throw new Error("Invalid file ID");
    }
    
    try {
      const response = await api.post(`/CodeFile/${fileId}/apply-patch`, {
        patch,
      });
      
      if (!response.data) {
        console.error("Invalid response from applyPatch:", response.data);
        throw new Error("Failed to apply patch - invalid response");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error applying patch:", error);
      
      // Check if it's a 302 redirect (likely auth issue)
      if (error.response?.status === 302 || error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      
      throw error;
    }
  }

  /**
   * Obține diff-ul între original și current
   */
  async getDiff(fileId) {
    const response = await api.get(`/CodeFile/${fileId}/diff`);
    return response.data;
  }

  /**
   * Reset fișierul la versiunea originală
   */
  async resetToOriginal(fileId) {
    const response = await api.post(`/CodeFile/${fileId}/reset`);
    return response.data;
  }

  /**
   * Descarcă fișierul curent (cu fix-urile aplicate)
   */
  async downloadFile(fileId, fileName) {
    try {
      const response = await api.get(`/CodeFile/${fileId}/download`, {
        params: { fileName },
        responseType: 'blob',
      });
      
      // Creează un link temporar pentru descărcare
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `fixed_${fileId}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, message: 'Fișier descărcat cu succes' };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Șterge fișierele temporare
   */
  async deleteTempFiles(fileId) {
    const response = await api.delete(`/CodeFile/${fileId}`);
    return response.data;
  }
}

export default new CodeFileService();

