import { definePageMetaTags } from 'svelte-meta-tags';
import { fail } from '@sveltejs/kit';
import { zod4 } from 'sveltekit-superforms/adapters';
import { superValidate } from 'sveltekit-superforms';
import { APIError } from 'better-auth/api';
import { updateProfileSchema, changePasswordSchema, enableTwoFactorSchema } from '$lib/utils/validators';

export const load = async ({ locals }) => {
  const { user, session, setting } = locals;

  const pageMetaTags = definePageMetaTags({
    title: 'Account & Security',
    robots: 'noindex, nofollow'
  });

  const profileForm = await superValidate({
    name: user?.name ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  }, zod4(updateProfileSchema));

  const passwordForm = await superValidate(zod4(changePasswordSchema));
  const twoFactorForm = await superValidate(zod4(enableTwoFactorSchema));

  return {
    ...pageMetaTags,
    user,
    session,
    setting,
    profileForm,
    passwordForm,
    twoFactorForm
  }
}
export const actions = {
  profile: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(updateProfileSchema))
    if (!form.valid) {
      return fail(400, {
        form,
        message: Object.values(form.errors).flat().join(', ')
      })
    }

    const response = await locals.auth?.api.updateUser({
      body: {
        name: form.data.name,
        username: form.data.username,
        phone: form.data.phone,
      }
    })
    if (!response?.status) {
      return fail(400, {
        form,
        message: 'Failed to update profile'
      })
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      form
    }
  },
  password: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(changePasswordSchema))
    if (!form.valid) {
      return fail(400, {
        form,
        message: Object.values(form.errors).flat().join(', ')
      })
    }

    try {
      await locals.auth?.api.changePassword({
        body: {
          newPassword: form.data.newPassword,
          currentPassword: form.data.currentPassword,
          revokeOtherSessions: true,
        }
      })

      return {
        success: true,
        message: 'Profile updated successfully',
        form
      }
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, {
          form,
          success: false,
          message: error.message || 'Failed to update password'
        });
      }
      if (error instanceof Error) {
        return fail(500, {
          form,
          success: false,
          message: error.message || 'Unexpected error'
        });
      }
      return fail(500, {
        form,
        success: false,
        message: 'Unexpected error'
      });
    }
  },
  "two-factor": async ({ request, locals }) => {
    const form = await superValidate(request, zod4(enableTwoFactorSchema))
    if (!form.valid) {
      return fail(400, {
        form,
        message: Object.values(form.errors).flat().join(', ')
      })
    }

    try {
      let response: any = {}
      response = await locals.auth?.api.enableTwoFactor({
        body: {
          password: form.data.password,
          method: "totp",
        },
        headers: request.headers,
      })

      if (!response?.totpURI || !response?.backupCodes) {
        return fail(400, {
          form,
          message: 'Failed to update two-factor authentication'
        })
      }

      return {
        message: 'Two-factor authentication updated successfully',
        data: response,
        form
      }
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, {
          form,
          success: false,
          message: error.message || 'Failed to update password'
        });
      }
      if (error instanceof Error) {
        return fail(500, {
          form,
          success: false,
          message: error.message || 'Unexpected error'
        });
      }
      return fail(500, {
        form,
        success: false,
        message: 'Unexpected error'
      });
    }
  }
}