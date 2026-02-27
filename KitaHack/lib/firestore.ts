import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { MealPlan, UserProfile, WeeklyMealPlan } from './types';
import { getAuth } from 'firebase/auth';
import app from './firebase';

// ============================================================
// GET CURRENT USER ID
// ============================================================

function getCurrentUserId(): string {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
}

// ============================================================
// MEAL PLANS CRUD (DAILY)
// ============================================================

export async function saveMealPlanToFirestore(plan: MealPlan): Promise<string> {
    const userId = getCurrentUserId();

    // 🔥 CHANGED: Saving to users -> userId -> saved_plans
    const docRef = await addDoc(collection(db, 'users', userId, 'saved_plans'), {
        userId,
        planId: plan.id,
        date: plan.date,
        breakfast: {
            id: plan.breakfast.id,
            name: plan.breakfast.name,
            caloriesMin: plan.breakfast.caloriesMin,
            caloriesMax: plan.breakfast.caloriesMax,
            cost: plan.breakfast.cost,
            cuisine: plan.breakfast.cuisine,
            prepTime: plan.breakfast.prepTime,
            protein: plan.breakfast.protein,
            carbs: plan.breakfast.carbs,
            fats: plan.breakfast.fats,
            fiber: plan.breakfast.fiber,
            whyThisMeal: plan.breakfast.whyThisMeal,
            ingredients: plan.breakfast.ingredients,
            mealType: plan.breakfast.mealType,
        },
        lunch: {
            id: plan.lunch.id,
            name: plan.lunch.name,
            caloriesMin: plan.lunch.caloriesMin,
            caloriesMax: plan.lunch.caloriesMax,
            cost: plan.lunch.cost,
            cuisine: plan.lunch.cuisine,
            prepTime: plan.lunch.prepTime,
            protein: plan.lunch.protein,
            carbs: plan.lunch.carbs,
            fats: plan.lunch.fats,
            fiber: plan.lunch.fiber,
            whyThisMeal: plan.lunch.whyThisMeal,
            ingredients: plan.lunch.ingredients,
            mealType: plan.lunch.mealType,
        },
        dinner: {
            id: plan.dinner.id,
            name: plan.dinner.name,
            caloriesMin: plan.dinner.caloriesMin,
            caloriesMax: plan.dinner.caloriesMax,
            cost: plan.dinner.cost,
            cuisine: plan.dinner.cuisine,
            prepTime: plan.dinner.prepTime,
            protein: plan.dinner.protein,
            carbs: plan.dinner.carbs,
            fats: plan.dinner.fats,
            fiber: plan.dinner.fiber,
            whyThisMeal: plan.dinner.whyThisMeal,
            ingredients: plan.dinner.ingredients,
            mealType: plan.dinner.mealType,
        },
        totalCost: plan.totalCost,
        totalCaloriesMin: plan.totalCaloriesMin,
        totalCaloriesMax: plan.totalCaloriesMax,
        preferences: plan.preferences,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
}

export async function getSavedPlansFromFirestore(): Promise<MealPlan[]> {
    const userId = getCurrentUserId();

    // 🔥 CHANGED: Reading directly from users -> userId -> saved_plans
    // We don't even need the "where" clause anymore because it's already in the user's private folder!
    const plansRef = collection(db, 'users', userId, 'saved_plans');
    const snapshot = await getDocs(plansRef);

    const plans: MealPlan[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            id: docSnap.id, 
            date: data.date,
            breakfast: data.breakfast,
            lunch: data.lunch,
            dinner: data.dinner,
            totalCost: data.totalCost,
            totalCaloriesMin: data.totalCaloriesMin,
            totalCaloriesMax: data.totalCaloriesMax,
            preferences: data.preferences,
            isSaved: true,
        } as MealPlan;
    });

    // Sort by date descending (newest first)
    plans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return plans;
}

export async function deleteMealPlanFromFirestore(planId: string): Promise<void> {
    const userId = getCurrentUserId();
    
    // 🔥 CHANGED: Deleting from users -> userId -> saved_plans
    await deleteDoc(doc(db, 'users', userId, 'saved_plans', planId));
}

// ============================================================
// USER PROFILE
// ============================================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const profileRef = doc(db, 'userProfiles', uid);
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.data() as UserProfile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
    const profileRef = doc(db, 'userProfiles', profile.uid);
    await setDoc(
        profileRef,
        {
            ...profile,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

// ============================================================
// WEEKLY MEAL PLANS CRUD
// ============================================================

export async function saveWeeklyPlanToFirestore(plan: WeeklyMealPlan): Promise<string> {
    const userId = getCurrentUserId();

    // 🔥 CHANGED: Saving to users -> userId -> weekly_plans
    const docRef = await addDoc(collection(db, 'users', userId, 'weekly_plans'), {
        userId,
        planId: plan.id,
        createdAt: plan.createdAt,
        preferences: plan.preferences,
        weekly_plan: plan.weekly_plan,
        smart_grocery_list: plan.smart_grocery_list,
        weekly_summary: plan.weekly_summary,
        savedAt: serverTimestamp(),
    });

    return docRef.id;
}

export async function getWeeklyPlansFromFirestore(): Promise<WeeklyMealPlan[]> {
    const userId = getCurrentUserId();

    // 🔥 CHANGED: Reading directly from users -> userId -> weekly_plans
    const plansRef = collection(db, 'users', userId, 'weekly_plans');
    const snapshot = await getDocs(plansRef);

    const plans: WeeklyMealPlan[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            createdAt: data.createdAt,
            preferences: data.preferences,
            weekly_plan: data.weekly_plan,
            smart_grocery_list: data.smart_grocery_list,
            weekly_summary: data.weekly_summary,
            isSaved: true,
        } as WeeklyMealPlan;
    });

    plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return plans;
}

export async function deleteWeeklyPlanFromFirestore(planId: string): Promise<void> {
    const userId = getCurrentUserId();
    
    // 🔥 CHANGED: Deleting from users -> userId -> weekly_plans
    await deleteDoc(doc(db, 'users', userId, 'weekly_plans', planId));
}