# Test Cases

## 0. Cluster Setup

> Note: The term "cluster" comes from machine learning, where "graph clustering" is about partitioning nodes in a graph into cohesive groups (clusters) based on their common characteristics.

Create a new cluster to get started from the Admin Dashboard by clicking **Create Cluster**. It takes time to build a cluster because once the list of nodes has been retrieved from a Murmurations index, the aggregator app must fetch the profiles from every node in the list; this process can take some time if the list is long. Select two or more tags (e.g., "network" and "software") and check the **All Tags** checkbox to reduce the total size of the node list.

## 1. Basic Tests

### 1.1 Add New Profile

- **Context**: A new profile is published to the index.
- **Expected Result**: The new profile should appear in the updated profiles list.
- **Test Steps**:
  1. Publish a new profile to the index.
  2. Update the cluster (click **Update Nodes**).
  3. Confirm the new profile appears under **Updated Profiles**.

### 1.2 Update Existing Profile

- **Context**: An existing profile is updated in the index.
- **Expected Result**: The updated profile should appear in the updated profiles list.
- **Test Steps**:
  1. Update an existing profile in the index (e.g., change the name or description).
  2. Update the cluster.
  3. Confirm the profile appears under **Updated Profiles** with the new data (confirm this in the DB's `updated_data` column).

### 1.3 Delete Profile

- **Context**: A profile is marked as deleted in the index.
- **Expected Result**: The profile should appear in the deleted profiles list.
- **Test Steps**:
  1. Mark a profile as deleted in the index.
  2. Update the cluster.
  3. Confirm the profile appears under **Deleted Profiles**.

## 2. Authority Transitions

A profile has "authority" if it is hosted at the website it is claiming to be about. For example, if a profile is claiming to be about -- by setting its primary URL to -- <https://murmurations.network>, this obviously has more meaning if the profile is actually hosted at <https://murmurations.network> rather than some other website. For more context, see this FAQ in the Murmurations docs:

<https://docs.murmurations.network/faqs/schema.html#what-is-a-primary-url>

A node's authority must prioritized by the aggregator when its profile claiming the primary URL is hosted at that primary URL.

### 2.1 From Authoritative to Unauthoritative Profile (AP -> UAP)

- **Context**: A profile claiming a primary URL but not hosted at that primary URL is overridden by a profile actually hosted at that primary URL.
- **Expected Result**:
  - `hasAuthority` should be updated to `0` in the DB for the overridden profile.
  - If `status !== 'ignored'` and `isAvailable === 1`, the profile should appear under the **Unauthoritative Profiles** list.
  - `status` should be changed to `'ignored'` automatically.
- **Test Steps**:
  1. Add a profile to a website that is not the primary URL and post it to the index.
  2. Update the cluster and set its `status` to `'published'`.
  3. Add the same profile to a website that is the same as the primary URL and post it to the index.
  4. Verify the first profile appears under the **Unauthoritative Profiles** list has `status === 'ignored'` and `hasAuthority === 0` in the DB.

### 2.2 From Unauthoritative to Authoritative Profile (UAP -> AP)

- **Context**: The authoritative profile hosted at the primary URL is removed from the index so the overridden profile is reinstated as the authoritative profile.
- **Expected Result**:
  - `hasAuthority` should be updated to `1` in the DB for the overridden profile.
  - `status` should remain unchanged (`ignored`) -- a manual change is required to publish it again.
- **Test Steps**:
  1. Delete the authoritative profile (primary URL is the same as the host for the profile) from the index.
  2. Update the cluster.
  3. Confirm the previously unauthoritative profile `hasAuthority = 1` and `status === 'ignored'` in the DB.

## 3. Profile State Edge Cases

### 3.1 Unavailable profile revalidated

- **Context**: Re-checking profiles if the profile is not available.
- **Expected Result**: The profile should should update in the background.
- **Test Steps**:
  1. Temporarily make the WordPress website unavailable.
  2. Create a new cluster to get the profiles.
  3. Confirm the profile is unavailable in the list.
  4. Make the site available again.
  5. Update the cluster.
  6. Go to `Edit Node` page and see the profile becomes available.

### 3.2 Deleted in index, not present locally

- **Context**: A profile marked as deleted is returned from the index, but not present locally.
- **Expected Result**: Skipped silently with no error or updates.
- **Test Steps**:
  1. Simulate a deleted profile in index that's missing locally.
  2. Update the cluster.
  3. Verify no error is shown, and nothing is deleted.

### 3.3 New profile from a UAP domain

- **Context**: A new profile is published on a domain without authority.
- **Expected Result**:
  - Should show up in the updated List with `hasAuthority = 0`
- **Test Steps**:
  1. Publish a profile on a domain like `test-tool`.
  2. Update the cluster.
  3. Verify it appears in `profileList` with `hasAuthority = 0`

### 3.4 New profile from an AP domain

- **Context**: A new profile from an authoritative domain.
- **Expected Result**:
  - Profile is added to `profileList`
  - Unauthoritative profiles should show up in the unauthoritative profile list.
- **Test Steps**:
  1. Publish a profile on a self-built WordPress domain.
  2. Update the cluster.
  3. Verify it appears in `profileList` with `hasAuthority = 1`, and unauthoritative profiles should show up in the unauthoritative profile list.

## 4. Timestamp Synchronization

### 4.1 Same timestamp – no update

- **Context**: `last_updated` timestamp matches the last trigger time.
- **Expected Result**: Update the last_updated after click the `Update Node` button.
- **Test Steps**:
  1. Record the current last_updated timestamp.
  2. Update the cluster.
  3. Confirm last_updated is applied and shown in the cluster list.

## 5. Error and Empty Response Handling

### 5.1 API Error Handling

- **Context**: Simulate an API error in `fetchProfiles`, `updateNode`, or `deleteNode`.
- **Expected Result**:
  - Error is caught
  - Toast displays the error
  - Flow continues without crashing
- **Test Steps**
  1. Change the URL of index_url in the cluster.
  2. Update the cluster.
  3. Check the errors show up in the toast.
  4. Confirm that the user is redirected to the home page.

### 5.2 No updates returned

- **Context**: No updates, deleted, or unauthoritative profiles are returned.
- **Expected Result**:
  - Toast message: `"No updated profiles found."`
  - User is redirected to `/`
- **Test Steps**:
  1. Ensure there are no new, deleted, or unauthoritative profiles in the index service.
  2. Update the cluster.
  3. Check toast message appears: `No updated profiles found`.
  4. Confirm that the user is redirected to the home page.
