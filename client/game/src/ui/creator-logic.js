export class AuthLogic {

  async register(username, email, password) {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'An unknown registration error occurred.');
    }

    return data;
  }

  async verify(identifier, password) {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Invalid login information.');
    }

    return { success: true, account: data };
  }

  async createCharacter(uuid, charData) {
    const response = await fetch('/create-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, charData })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to create character.');
    }

    return await response.json();
  }

  async updateCharacter(uuid, charData) {
    const response = await fetch('/update-character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid, charData })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update character.');
    }

    return await response.json();
  }
}
