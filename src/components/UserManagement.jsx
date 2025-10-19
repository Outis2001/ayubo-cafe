/**
 * User Management Component
 * 
 * Allows the owner to:
 * - View all user accounts
 * - Create new users
 * - Edit user details
 * - Deactivate/activate users
 * - Reset user passwords (owner override)
 * 
 * Owner-only feature with role-based access control.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { validateUsername, validateEmail, validateName, validatePhone, validatePassword } from '../utils/validation';
import { hashPassword, generateResetToken } from '../utils/auth';
import { invalidateUserSessions } from '../utils/session';
import {
  logUserCreated,
  logUserUpdated,
  logUserDeactivated,
  logUserActivated,
  logPasswordChange
} from '../utils/auditLog';
import { sendWelcomeEmail, sendPasswordChangedEmail } from '../utils/email';
import { User, Trash2, X, Loader, Settings } from './icons';

const UserManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'cashier',
    password: '', // Only for create
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Password reset form state
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);

  /**
   * Check if current user is owner
   */
  const isOwner = currentUser?.role === 'owner';

  /**
   * Fetch all users from the database
   */
  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabaseClient
        .from('users')
        .select('user_id, username, email, first_name, last_name, phone, role, is_active, created_at, last_login_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching users:', fetchError);
        setError('Failed to load users. Please try again.');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchUsers();
    }
  }, [isOwner]);

  /**
   * Handle form input changes
   */
  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: null });
    }
  };

  /**
   * Validate the user form
   */
  const validateForm = (isEditing = false) => {
    const errors = {};

    // Username validation
    const usernameValidation = validateUsername(formData.username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.error;
    }

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    // First name validation
    const firstNameValidation = validateName(formData.first_name, 'First Name');
    if (!firstNameValidation.isValid) {
      errors.first_name = firstNameValidation.error;
    }

    // Last name validation
    const lastNameValidation = validateName(formData.last_name, 'Last Name');
    if (!lastNameValidation.isValid) {
      errors.last_name = lastNameValidation.error;
    }

    // Phone validation (optional)
    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }

    // Password validation (only for create, not edit)
    if (!isEditing) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors.join(' ');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle creating a new user
   */
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm(false)) {
      return;
    }

    setFormSubmitting(true);
    setError('');

    try {
      // Check if username or email already exists
      const { data: existingUsers, error: checkError } = await supabaseClient
        .from('users')
        .select('username, email')
        .or(`username.eq.${formData.username},email.eq.${formData.email}`);

      if (checkError) {
        console.error('Error checking existing users:', checkError);
        setError('Failed to create user. Please try again.');
        setFormSubmitting(false);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        const usernameExists = existingUsers.some(u => u.username === formData.username);
        const emailExists = existingUsers.some(u => u.email === formData.email);
        
        if (usernameExists) {
          setFormErrors({ ...formErrors, username: 'Username already exists.' });
        }
        if (emailExists) {
          setFormErrors({ ...formErrors, email: 'Email already exists.' });
        }
        
        setFormSubmitting(false);
        return;
      }

      // Hash the password
      const passwordHash = await hashPassword(formData.password);

      // Insert new user
      const { data: newUser, error: insertError } = await supabaseClient
        .from('users')
        .insert({
          username: formData.username,
          email: formData.email,
          password_hash: passwordHash,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: formData.role,
          is_active: true,
        })
        .select('user_id, username, email, first_name, last_name, phone, role, is_active, created_at, last_login_at')
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        setError('Failed to create user. Please try again.');
        setFormSubmitting(false);
        return;
      }

      // Log user creation
      await logUserCreated(
        newUser.user_id,
        newUser.username,
        currentUser.user_id,
        currentUser.username,
        null,
        null,
        {
          role: newUser.role,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name
        }
      );

      // Send welcome email with login credentials
      await sendWelcomeEmail(
        newUser.email,
        newUser.first_name,
        newUser.username,
        formData.password // Send the plain password (before hashing)
      );

      // Refresh user list
      setUsers([newUser, ...users]);

      // Reset form and close
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'cashier',
        password: '',
      });
      setShowCreateForm(false);
      setFormErrors({});

    } catch (error) {
      console.error('Unexpected error creating user:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  /**
   * Handle editing a user
   */
  const handleEditUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm(true)) {
      return;
    }

    setFormSubmitting(true);
    setError('');

    try {
      // Check if username or email already exists (excluding current user)
      const { data: existingUsers, error: checkError } = await supabaseClient
        .from('users')
        .select('user_id, username, email')
        .or(`username.eq.${formData.username},email.eq.${formData.email}`)
        .neq('user_id', editingUser.user_id);

      if (checkError) {
        console.error('Error checking existing users:', checkError);
        setError('Failed to update user. Please try again.');
        setFormSubmitting(false);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        const usernameExists = existingUsers.some(u => u.username === formData.username);
        const emailExists = existingUsers.some(u => u.email === formData.email);
        
        if (usernameExists) {
          setFormErrors({ ...formErrors, username: 'Username already exists.' });
        }
        if (emailExists) {
          setFormErrors({ ...formErrors, email: 'Email already exists.' });
        }
        
        setFormSubmitting(false);
        return;
      }

      // Track changed fields
      const changedFields = {};
      if (formData.username !== editingUser.username) changedFields.username = formData.username;
      if (formData.email !== editingUser.email) changedFields.email = formData.email;
      if (formData.first_name !== editingUser.first_name) changedFields.first_name = formData.first_name;
      if (formData.last_name !== editingUser.last_name) changedFields.last_name = formData.last_name;
      if (formData.phone !== editingUser.phone) changedFields.phone = formData.phone;
      if (formData.role !== editingUser.role) changedFields.role = formData.role;

      // Update user
      const { data: updatedUser, error: updateError } = await supabaseClient
        .from('users')
        .update({
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: formData.role,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', editingUser.user_id)
        .select('user_id, username, email, first_name, last_name, phone, role, is_active, created_at, last_login_at')
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        setError('Failed to update user. Please try again.');
        setFormSubmitting(false);
        return;
      }

      // Log user update
      await logUserUpdated(
        updatedUser.user_id,
        updatedUser.username,
        currentUser.user_id,
        currentUser.username,
        null,
        null,
        changedFields
      );

      // Refresh user list
      setUsers(users.map(u => u.user_id === updatedUser.user_id ? updatedUser : u));

      // Reset form and close
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'cashier',
        password: '',
      });
      setEditingUser(null);
      setFormErrors({});

    } catch (error) {
      console.error('Unexpected error updating user:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  /**
   * Handle deactivating/activating a user
   */
  const handleToggleUserStatus = async (user) => {
    if (user.user_id === currentUser.user_id) {
      alert('You cannot deactivate your own account.');
      return;
    }

    const newStatus = !user.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} user "${user.username}"?`)) {
      return;
    }

    setError('');

    try {
      // Update user status
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.user_id);

      if (updateError) {
        console.error(`Error ${action}ing user:`, updateError);
        setError(`Failed to ${action} user. Please try again.`);
        return;
      }

      // If deactivating, invalidate all user sessions
      if (!newStatus) {
        await invalidateUserSessions(user.user_id);
      }

      // Log the action
      if (newStatus) {
        await logUserActivated(
          user.user_id,
          user.username,
          currentUser.user_id,
          currentUser.username
        );
      } else {
        await logUserDeactivated(
          user.user_id,
          user.username,
          currentUser.user_id,
          currentUser.username,
          null,
          null,
          'Deactivated by owner'
        );
      }

      // Refresh user list
      setUsers(users.map(u => u.user_id === user.user_id ? { ...u, is_active: newStatus } : u));

    } catch (error) {
      console.error(`Unexpected error ${action}ing user:`, error);
      setError(`An unexpected error occurred. Please try again.`);
    }
  };

  /**
   * Open edit form with user data
   */
  const handleOpenEditForm = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      role: user.role,
      password: '', // Not used in edit
    });
    setFormErrors({});
    setError('');
  };

  /**
   * Handle owner password reset (override)
   */
  const handleOwnerPasswordReset = async (e) => {
    e.preventDefault();

    setResetPasswordError('');

    // Validate new password
    const passwordValidation = validatePassword(resetPasswordData.newPassword);
    if (!passwordValidation.isValid) {
      setResetPasswordError(passwordValidation.errors.join(' '));
      return;
    }

    // Check if passwords match
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }

    setResetPasswordSubmitting(true);

    try {
      // Hash the new password
      const newPasswordHash = await hashPassword(resetPasswordData.newPassword);

      // Update the user's password
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', resettingPasswordUser.user_id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        setResetPasswordError('Failed to update password. Please try again.');
        setResetPasswordSubmitting(false);
        return;
      }

      // Invalidate all user sessions (force re-login)
      await invalidateUserSessions(resettingPasswordUser.user_id);

      // Log password change (owner override)
      await logPasswordChange(
        resettingPasswordUser.user_id,
        resettingPasswordUser.username,
        null,
        null,
        'owner_override',
        currentUser.user_id
      );

      // Send password changed notification email
      await sendPasswordChangedEmail(
        resettingPasswordUser.email,
        resettingPasswordUser.first_name,
        'owner_override'
      );

      // Reset form and close
      setResetPasswordData({
        newPassword: '',
        confirmPassword: '',
      });
      setResettingPasswordUser(null);
      setResetPasswordError('');

      alert(`Password reset successful for "${resettingPasswordUser.username}". All their sessions have been logged out.`);

    } catch (error) {
      console.error('Unexpected error resetting password:', error);
      setResetPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  /**
   * Open password reset form
   */
  const handleOpenPasswordResetForm = (user) => {
    if (user.user_id === currentUser.user_id) {
      alert('Please use the "Change Password" option in your profile to change your own password.');
      return;
    }

    setResettingPasswordUser(user);
    setResetPasswordData({
      newPassword: '',
      confirmPassword: '',
    });
    setResetPasswordError('');
  };

  // If not owner, show access denied
  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
          <p className="text-gray-700">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
                <User size={32} />
                User Management
              </h1>
              <p className="text-gray-600 mt-1">Manage all user accounts</p>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(true);
                setFormData({
                  username: '',
                  email: '',
                  first_name: '',
                  last_name: '',
                  phone: '',
                  role: 'cashier',
                  password: '',
                });
                setFormErrors({});
                setError('');
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition"
            >
              + Create User
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* User List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Username</th>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Last Login</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{user.username}</td>
                    <td className="px-6 py-4">{`${user.first_name} ${user.last_name}`}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditForm(user)}
                          className="text-blue-600 hover:text-blue-800 p-2"
                          title="Edit User"
                        >
                          <Settings size={20} />
                        </button>
                        <button
                          onClick={() => handleOpenPasswordResetForm(user)}
                          className="text-yellow-600 hover:text-yellow-800 p-2"
                          title="Reset Password"
                          disabled={user.user_id === currentUser.user_id}
                        >
                          🔑
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={`p-2 ${user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          disabled={user.user_id === currentUser.user_id}
                        >
                          {user.is_active ? <Trash2 size={20} /> : '✓'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center text-gray-600 text-sm">
          Total Users: <strong>{users.length}</strong> | 
          Active: <strong>{users.filter(u => u.is_active).length}</strong> | 
          Inactive: <strong>{users.filter(u => !u.is_active).length}</strong>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {(showCreateForm || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-700">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
                  setFormErrors({});
                  setError('');
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editingUser ? handleEditUser : handleCreateUser}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                      formErrors.username ? 'border-red-300 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'
                    }`}
                    disabled={formSubmitting}
                  />
                  {formErrors.username && <p className="text-red-600 text-xs mt-1">{formErrors.username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                      formErrors.email ? 'border-red-300 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'
                    }`}
                    disabled={formSubmitting}
                  />
                  {formErrors.email && <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleFormChange('first_name', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                      formErrors.first_name ? 'border-red-300 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'
                    }`}
                    disabled={formSubmitting}
                  />
                  {formErrors.first_name && <p className="text-red-600 text-xs mt-1">{formErrors.first_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                      formErrors.last_name ? 'border-red-300 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'
                    }`}
                    disabled={formSubmitting}
                  />
                  {formErrors.last_name && <p className="text-red-600 text-xs mt-1">{formErrors.last_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                      formErrors.phone ? 'border-red-300 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'
                    }`}
                    disabled={formSubmitting}
                  />
                  {formErrors.phone && <p className="text-red-600 text-xs mt-1">{formErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleFormChange('role', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                    disabled={formSubmitting}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                      formErrors.password ? 'border-red-300 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'
                    }`}
                    disabled={formSubmitting}
                  />
                  {formErrors.password && <p className="text-red-600 text-xs mt-1">{formErrors.password}</p>}
                  <p className="text-xs text-gray-600 mt-1">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50"
                >
                  {formSubmitting ? <Loader /> : (editingUser ? 'Update User' : 'Create User')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingUser(null);
                    setFormErrors({});
                    setError('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resettingPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-700">
                Reset Password: {resettingPasswordUser.username}
              </h2>
              <button
                onClick={() => {
                  setResettingPasswordUser(null);
                  setResetPasswordData({ newPassword: '', confirmPassword: '' });
                  setResetPasswordError('');
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleOwnerPasswordReset}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">New Password</label>
                <input
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={resetPasswordSubmitting}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={resetPasswordSubmitting}
                />
              </div>

              {resetPasswordError && (
                <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">{resetPasswordError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={resetPasswordSubmitting}
                  className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white py-3 rounded-lg font-bold hover:from-yellow-700 hover:to-yellow-800 transition disabled:opacity-50"
                >
                  {resetPasswordSubmitting ? <Loader /> : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResettingPasswordUser(null);
                    setResetPasswordData({ newPassword: '', confirmPassword: '' });
                    setResetPasswordError('');
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

