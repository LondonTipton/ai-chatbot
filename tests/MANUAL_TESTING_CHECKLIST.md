# Manual Testing Checklist for Appwrite Authentication

This document provides a comprehensive checklist for manually testing the Appwrite authentication implementation.

## Prerequisites

- Development server running (`pnpm dev`)
- Appwrite project configured with correct environment variables
- Database migrations applied
- Browser with developer tools open

## Test Environment Setup

1. Clear browser cookies and local storage
2. Open browser developer tools (F12)
3. Navigate to Network tab to monitor requests
4. Navigate to Application/Storage tab to inspect cookies

## 1. Registration Flow

### Test Case 1.1: Successful Registration

**Steps:**

1. Navigate to `/register`
2. Enter valid email (e.g., `test@example.com`)
3. Enter valid password (minimum 6 characters)
4. Click "Sign Up" button

**Expected Results:**

- ✅ Success toast message appears: "Account created successfully!"
- ✅ Redirected to home page (`/`)
- ✅ Session cookie is set (check Application tab)
- ✅ User email appears in sidebar user menu
- ✅ Chat interface is accessible

### Test Case 1.2: Registration with Existing Email

**Steps:**

1. Navigate to `/register`
2. Enter email that already exists
3. Enter valid password
4. Click "Sign Up" button

**Expected Results:**

- ✅ Error toast message appears: "Account already exists!"
- ✅ Remains on registration page
- ✅ No session cookie is set

### Test Case 1.3: Registration with Invalid Email

**Steps:**

1. Navigate to `/register`
2. Enter invalid email (e.g., `notanemail`)
3. Enter valid password
4. Click "Sign Up" button

**Expected Results:**

- ✅ Error message appears
- ✅ Remains on registration page
- ✅ No session cookie is set

### Test Case 1.4: Registration with Short Password

**Steps:**

1. Navigate to `/register`
2. Enter valid email
3. Enter password less than 6 characters (e.g., `123`)
4. Click "Sign Up" button

**Expected Results:**

- ✅ Error message appears
- ✅ Remains on registration page
- ✅ No session cookie is set

## 2. Login Flow

### Test Case 2.1: Successful Login

**Steps:**

1. Navigate to `/login`
2. Enter registered email
3. Enter correct password
4. Click "Sign In" button

**Expected Results:**

- ✅ Redirected to home page (`/`)
- ✅ Session cookie is set
- ✅ User email appears in sidebar user menu
- ✅ Chat interface is accessible

### Test Case 2.2: Login with Invalid Email

**Steps:**

1. Navigate to `/login`
2. Enter non-existent email
3. Enter any password
4. Click "Sign In" button

**Expected Results:**

- ✅ Error message appears: "Invalid email or password"
- ✅ Remains on login page
- ✅ No session cookie is set

### Test Case 2.3: Login with Invalid Password

**Steps:**

1. Navigate to `/login`
2. Enter registered email
3. Enter incorrect password
4. Click "Sign In" button

**Expected Results:**

- ✅ Error message appears: "Invalid email or password"
- ✅ Remains on login page
- ✅ No session cookie is set

### Test Case 2.4: Login with Malformed Email

**Steps:**

1. Navigate to `/login`
2. Enter malformed email (e.g., `notanemail`)
3. Enter any password
4. Click "Sign In" button

**Expected Results:**

- ✅ Error message appears
- ✅ Remains on login page
- ✅ No session cookie is set

## 3. Guest User Flow

### Test Case 3.1: Guest Session Creation

**Steps:**

1. Clear all cookies and storage
2. Navigate to home page (`/`)

**Expected Results:**

- ✅ Redirected to `/api/auth/guest?redirectUrl=...`
- ✅ Redirected back to home page
- ✅ Session cookie is set
- ✅ User menu shows "Guest"
- ✅ "Login to your account" option appears in user menu
- ✅ Chat interface is accessible

### Test Case 3.2: Guest User Can Create Chats

**Steps:**

1. As guest user, create a new chat
2. Send a message
3. Verify chat is saved

**Expected Results:**

- ✅ Chat is created successfully
- ✅ Message is sent and response received
- ✅ Chat appears in sidebar history
- ✅ Chat persists on page reload

### Test Case 3.3: Guest User Upgrade to Registered User

**Steps:**

1. As guest user with existing chats, click upgrade prompt
2. Enter valid email and password
3. Submit upgrade form

**Expected Results:**

- ✅ Success message appears
- ✅ User email appears in sidebar (no longer "Guest")
- ✅ All previous chats are preserved
- ✅ User can continue using the application
- ✅ "Sign out" option appears in user menu

### Test Case 3.4: Guest User Cannot Access Auth Pages

**Steps:**

1. As guest user, navigate to `/login`
2. As guest user, navigate to `/register`

**Expected Results:**

- ✅ Can access `/login` page
- ✅ Can access `/register` page
- ✅ Login/register forms are displayed

## 4. Logout Flow

### Test Case 4.1: Successful Logout

**Steps:**

1. Login as registered user
2. Open sidebar
3. Click user menu button
4. Click "Sign out"

**Expected Results:**

- ✅ Session cookie is cleared
- ✅ User menu shows "Guest"
- ✅ New anonymous session is created
- ✅ Previous chats are no longer visible
- ✅ "Login to your account" option appears

### Test Case 4.2: Logout Without Active Session

**Steps:**

1. Manually delete session cookie
2. Try to logout via UI

**Expected Results:**

- ✅ No errors occur
- ✅ User remains as guest
- ✅ Application continues to function

## 5. Session Persistence

### Test Case 5.1: Session Persists Across Page Reloads

**Steps:**

1. Login as registered user
2. Reload the page (F5)

**Expected Results:**

- ✅ User remains logged in
- ✅ User email still appears in sidebar
- ✅ Session cookie is still present
- ✅ No redirect to login page

### Test Case 5.2: Session Persists Across Browser Restart

**Steps:**

1. Login as registered user
2. Close browser completely
3. Reopen browser and navigate to application

**Expected Results:**

- ✅ User remains logged in
- ✅ User email still appears in sidebar
- ✅ Session cookie is still present
- ✅ No redirect to login page

### Test Case 5.3: Session Expiration Handling

**Steps:**

1. Login as registered user
2. Manually expire session (delete from Appwrite console or wait for expiration)
3. Try to perform an action

**Expected Results:**

- ✅ User is logged out gracefully
- ✅ New guest session is created
- ✅ User is prompted to login again
- ✅ No application errors

## 6. Protected Route Access

### Test Case 6.1: Authenticated User Cannot Access Auth Pages

**Steps:**

1. Login as registered user
2. Navigate to `/login`
3. Navigate to `/register`

**Expected Results:**

- ✅ Redirected to home page (`/`) from `/login`
- ✅ Redirected to home page (`/`) from `/register`
- ✅ No errors occur

### Test Case 6.2: Guest User Can Access Auth Pages

**Steps:**

1. As guest user, navigate to `/login`
2. As guest user, navigate to `/register`

**Expected Results:**

- ✅ Can access `/login` page
- ✅ Can access `/register` page
- ✅ Forms are displayed correctly

### Test Case 6.3: Unauthenticated User Gets Guest Session

**Steps:**

1. Clear all cookies
2. Navigate to any protected route

**Expected Results:**

- ✅ Guest session is created automatically
- ✅ User can access the application
- ✅ User menu shows "Guest"

## 7. Error Scenarios

### Test Case 7.1: Network Error During Login

**Steps:**

1. Open browser developer tools
2. Go to Network tab and enable "Offline" mode
3. Try to login

**Expected Results:**

- ✅ Error message appears
- ✅ User-friendly error message displayed
- ✅ No application crash

### Test Case 7.2: Network Error During Registration

**Steps:**

1. Open browser developer tools
2. Go to Network tab and enable "Offline" mode
3. Try to register

**Expected Results:**

- ✅ Error message appears
- ✅ User-friendly error message displayed
- ✅ No application crash

### Test Case 7.3: Invalid Session Cookie

**Steps:**

1. Login as registered user
2. Manually modify session cookie value in browser
3. Reload page

**Expected Results:**

- ✅ Invalid session is detected
- ✅ New guest session is created
- ✅ User is logged out gracefully
- ✅ No application errors

## 8. Multi-Browser Testing

### Test Case 8.1: Chrome

**Steps:**

1. Perform all above tests in Google Chrome

**Expected Results:**

- ✅ All tests pass

### Test Case 8.2: Firefox

**Steps:**

1. Perform all above tests in Mozilla Firefox

**Expected Results:**

- ✅ All tests pass

### Test Case 8.3: Safari (if available)

**Steps:**

1. Perform all above tests in Safari

**Expected Results:**

- ✅ All tests pass

### Test Case 8.4: Edge

**Steps:**

1. Perform all above tests in Microsoft Edge

**Expected Results:**

- ✅ All tests pass

## 9. Mobile Testing

### Test Case 9.1: Mobile Chrome

**Steps:**

1. Open application in mobile Chrome (or use Chrome DevTools device emulation)
2. Test registration, login, and logout flows

**Expected Results:**

- ✅ All flows work correctly
- ✅ UI is responsive
- ✅ No layout issues

### Test Case 9.2: Mobile Safari (if available)

**Steps:**

1. Open application in mobile Safari
2. Test registration, login, and logout flows

**Expected Results:**

- ✅ All flows work correctly
- ✅ UI is responsive
- ✅ No layout issues

## Test Results Summary

| Test Case                               | Status | Notes |
| --------------------------------------- | ------ | ----- |
| 1.1 Successful Registration             | ⬜     |       |
| 1.2 Registration with Existing Email    | ⬜     |       |
| 1.3 Registration with Invalid Email     | ⬜     |       |
| 1.4 Registration with Short Password    | ⬜     |       |
| 2.1 Successful Login                    | ⬜     |       |
| 2.2 Login with Invalid Email            | ⬜     |       |
| 2.3 Login with Invalid Password         | ⬜     |       |
| 2.4 Login with Malformed Email          | ⬜     |       |
| 3.1 Guest Session Creation              | ⬜     |       |
| 3.2 Guest User Can Create Chats         | ⬜     |       |
| 3.3 Guest User Upgrade                  | ⬜     |       |
| 3.4 Guest User Auth Page Access         | ⬜     |       |
| 4.1 Successful Logout                   | ⬜     |       |
| 4.2 Logout Without Session              | ⬜     |       |
| 5.1 Session Persists on Reload          | ⬜     |       |
| 5.2 Session Persists on Browser Restart | ⬜     |       |
| 5.3 Session Expiration Handling         | ⬜     |       |
| 6.1 Auth User Cannot Access Auth Pages  | ⬜     |       |
| 6.2 Guest User Can Access Auth Pages    | ⬜     |       |
| 6.3 Unauthenticated Gets Guest Session  | ⬜     |       |
| 7.1 Network Error During Login          | ⬜     |       |
| 7.2 Network Error During Registration   | ⬜     |       |
| 7.3 Invalid Session Cookie              | ⬜     |       |
| 8.1 Chrome Testing                      | ⬜     |       |
| 8.2 Firefox Testing                     | ⬜     |       |
| 8.3 Safari Testing                      | ⬜     |       |
| 8.4 Edge Testing                        | ⬜     |       |
| 9.1 Mobile Chrome Testing               | ⬜     |       |
| 9.2 Mobile Safari Testing               | ⬜     |       |

## Notes

- Mark each test case with ✅ (pass), ❌ (fail), or ⚠️ (partial pass) after testing
- Document any issues or unexpected behavior in the Notes column
- Take screenshots of any failures for debugging
- Test in both development and production environments if possible
