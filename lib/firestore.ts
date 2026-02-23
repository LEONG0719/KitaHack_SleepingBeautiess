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
import { MealPlan, UserProfile } from './types';
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
// MEAL PLANS CRUD
// ============================================================

export async function saveMealPlanToFirestore(plan: MealPlan): Promise<string> {
    const userId = getCurrentUserId();

    const docRef = await addDoc(collection(db, 'mealPlans'), {
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

    const q = query(
        collection(db, 'mealPlans'),
        where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);

    const plans: MealPlan[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            id: data.planId || docSnap.id,
            date: data.date,
            breakfast: data.breakfast,
            lunch: data.lunch,
            dinner: data.dinner,
            totalCost: data.totalCost,
            totalCaloriesMin: data.totalCaloriesMin,
            totalCaloriesMax: data.totalCaloriesMax,
            preferences: data.preferences,
            _firestoreId: docSnap.id,
        } as MealPlan & { _firestoreId: string };
    });

    // Sort by date descending (newest first)
    plans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return plans;
}

export async function deleteMealPlanFromFirestore(planId: string): Promise<void> {
    const userId = getCurrentUserId();

    // Find the document with matching planId and userId
    const q = query(
        collection(db, 'mealPlans'),
        where('userId', '==', userId),
        where('planId', '==', planId)
    );

    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map((docSnap) =>
        deleteDoc(doc(db, 'mealPlans', docSnap.id))
    );

    await Promise.all(deletePromises);
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
