import axios from './api';

class CodeFileService {
  /**
   * Creează un fișier temporar pentru review
   */
  async createTempFile(fileName, content) {
    const response = await axios.post('/api/CodeFile/create', {
      fileName,
      content,
    });
    return response.data;
  }

  /**
   * Obține conținutul curent al fișierului
   */
  async getCurrentContent(fileId) {
    const response = await axios.get(`/api/CodeFile/${fileId}/current`);
    return response.data;
  }

  /**
   * Obține conținutul original al fișierului
   */
  async getOriginalContent(fileId) {
    const response = await axios.get(`/api/CodeFile/${fileId}/original`);
    return response.data;
  }

  /**
   * Actualizează conținutul curent
   */
  async updateCurrentContent(fileId, content) {
    const response = await axios.post(`/api/CodeFile/${fileId}/update`, {
      content,
    });
    return response.data;
  }

  /**
   * Aplică un patch pe fișierul curent
   */
  async applyPatch(fileId, patch) {
    const response = await axios.post(`/api/CodeFile/${fileId}/apply-patch`, {
      patch,
    });
    return response.data;
  }

  /**
   * Obține diff-ul între original și current
   */
  async getDiff(fileId) {
    const response = await axios.get(`/api/CodeFile/${fileId}/diff`);
    return response.data;
  }

  /**
   * Reset fișierul la versiunea originală
   */
  async resetToOriginal(fileId) {
    const response = await axios.post(`/api/CodeFile/${fileId}/reset`);
    return response.data;
  }

  /**
   * Șterge fișierele temporare
   */
  async deleteTempFiles(fileId) {
    const response = await axios.delete(`/api/CodeFile/${fileId}`);
    return response.data;
  }
}

export default new CodeFileService();

